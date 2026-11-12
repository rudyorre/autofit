package garmin

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

	"github.com/muktihari/fit/decoder"
	"github.com/muktihari/fit/encoder"
	"github.com/muktihari/fit/profile/basetype"
	"github.com/muktihari/fit/profile/filedef"
	"github.com/muktihari/fit/profile/mesgdef"
	"github.com/muktihari/fit/profile/typedef"

	"github.com/rudyorre/autofit/internal/analytics"
	"github.com/rudyorre/autofit/internal/config"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

const ProviderName = "garmin_personal"

type Service struct {
	cfg        config.Config
	repo       store.Repository
	httpClient *http.Client
}

func NewService(cfg config.Config, repo store.Repository) *Service {
	return &Service{
		cfg:        cfg,
		repo:       repo,
		httpClient: &http.Client{Timeout: 25 * time.Second},
	}
}

func (s *Service) Configured() bool {
	return s.cfg.GarminPersonalAPIKey != ""
}

// DecodeFITBytes decodes a real binary Garmin .FIT file using muktihari/fit into a CardioActivity with mile splits, HR zones, VDOT, Zone 2 efficiency, and TRIMP.
func DecodeFITBytes(userID, customTitle string, raw []byte) (*store.CardioActivity, error) {
	if userID == "" {
		userID = store.DefaultUserID
	}
	sum := sha256.Sum256(raw)
	shaHex := hex.EncodeToString(sum[:])

	dec := decoder.New(bytes.NewReader(raw))
	fitProto, err := dec.Decode()
	if err != nil {
		return nil, fmt.Errorf("decode fit binary: %w", err)
	}

	actFile := filedef.NewActivity(fitProto.Messages...)

	var (
		startedAt = time.Now().UTC()
		distM     float64
		durS      float64
		avgHR     int
		maxHR     int
		avgCad    int
		elevGainM float64
		sportStr  = "running"
	)

	if len(actFile.Sessions) > 0 {
		sess := actFile.Sessions[0]
		if !sess.StartTime.IsZero() && sess.StartTime.Year() >= 2000 {
			startedAt = sess.StartTime.UTC()
		} else if !sess.Timestamp.IsZero() && sess.Timestamp.Year() >= 2000 {
			startedAt = sess.Timestamp.UTC()
		}
		if sess.TotalDistance != basetype.Uint32Invalid {
			distM = float64(sess.TotalDistance) / 100.0
		}
		if sess.TotalTimerTime != basetype.Uint32Invalid && sess.TotalTimerTime > 0 {
			durS = float64(sess.TotalTimerTime) / 1000.0
		} else if sess.TotalElapsedTime != basetype.Uint32Invalid {
			durS = float64(sess.TotalElapsedTime) / 1000.0
		}
		if sess.AvgHeartRate != basetype.Uint8Invalid {
			avgHR = int(sess.AvgHeartRate)
		}
		if sess.MaxHeartRate != basetype.Uint8Invalid {
			maxHR = int(sess.MaxHeartRate)
		}
		if sess.AvgCadence != basetype.Uint8Invalid {
			avgCad = normalizeRunCadence(int(sess.AvgCadence))
		}
		if sess.TotalAscent != basetype.Uint16Invalid {
			elevGainM = float64(sess.TotalAscent)
		}
		if sess.Sport != typedef.SportInvalid {
			sportStr = sess.Sport.String()
		}
	}

	// Compute HR Zones & fallback summary stats from 1Hz/smart Record messages
	zonesSec := map[string]int{"z1": 0, "z2": 0, "z3": 0, "z4": 0, "z5": 0}
	var hrSum, hrCnt, cadSum, cadCnt int
	var prevTS time.Time
	for i, rec := range actFile.Records {
		dtSec := 1
		if i > 0 && !rec.Timestamp.IsZero() && !prevTS.IsZero() {
			diff := int(rec.Timestamp.Sub(prevTS).Seconds())
			if diff > 0 && diff <= 30 {
				dtSec = diff
			}
		}
		if !rec.Timestamp.IsZero() {
			prevTS = rec.Timestamp
		}
		if rec.HeartRate != basetype.Uint8Invalid && rec.HeartRate > 30 {
			hr := int(rec.HeartRate)
			hrSum += hr
			hrCnt++
			if hr > maxHR {
				maxHR = hr
			}
			switch {
			case hr < 126:
				zonesSec["z1"] += dtSec
			case hr < 146:
				zonesSec["z2"] += dtSec
			case hr < 162:
				zonesSec["z3"] += dtSec
			case hr < 176:
				zonesSec["z4"] += dtSec
			default:
				zonesSec["z5"] += dtSec
			}
		}
		if rec.Cadence != basetype.Uint8Invalid && rec.Cadence > 0 {
			cadSum += normalizeRunCadence(int(rec.Cadence))
			cadCnt++
		}
		if distM <= 0 && rec.Distance != basetype.Uint32Invalid {
			d := float64(rec.Distance) / 100.0
			if d > distM {
				distM = d
			}
		}
	}
	if avgHR == 0 && hrCnt > 0 {
		avgHR = hrSum / hrCnt
	}
	if avgCad == 0 && cadCnt > 0 {
		avgCad = cadSum / cadCnt
	}
	if durS <= 0 && len(actFile.Records) >= 2 {
		first := actFile.Records[0].Timestamp
		last := actFile.Records[len(actFile.Records)-1].Timestamp
		if last.After(first) {
			durS = last.Sub(first).Seconds()
		}
	}

	// Extract mile/lap splits from FIT Laps
	var splits []store.MileSplit
	for idx, lap := range actFile.Laps {
		var lapDist, lapDur, lapElev float64
		var lapHR, lapCad int
		if lap.TotalDistance != basetype.Uint32Invalid {
			lapDist = float64(lap.TotalDistance) / 100.0
		}
		if lap.TotalTimerTime != basetype.Uint32Invalid && lap.TotalTimerTime > 0 {
			lapDur = float64(lap.TotalTimerTime) / 1000.0
		} else if lap.TotalElapsedTime != basetype.Uint32Invalid {
			lapDur = float64(lap.TotalElapsedTime) / 1000.0
		}
		if lap.AvgHeartRate != basetype.Uint8Invalid {
			lapHR = int(lap.AvgHeartRate)
		}
		if lap.AvgCadence != basetype.Uint8Invalid {
			lapCad = normalizeRunCadence(int(lap.AvgCadence))
		}
		if lap.TotalAscent != basetype.Uint16Invalid {
			lapElev = float64(lap.TotalAscent)
		}
		if lapDist <= 0 || lapDur <= 0 {
			continue
		}
		secPerMi := (lapDur / lapDist) * 1609.344
		splits = append(splits, store.MileSplit{
			Mile:           idx + 1,
			DistanceM:      math.Round(lapDist*10) / 10,
			DurationS:      math.Round(lapDur*10) / 10,
			PaceFormatted:  analytics.FormatPaceMinPerMile(secPerMi),
			AvgHR:          lapHR,
			AvgCadence:     lapCad,
			ElevationGainM: lapElev,
		})
	}
	if distM <= 0 && len(splits) > 0 {
		for _, sp := range splits {
			distM += sp.DistanceM
			durS += sp.DurationS
		}
	}

	zonesMin := make(map[string]int, len(zonesSec))
	for k, sec := range zonesSec {
		zonesMin[k] = int(math.Round(float64(sec) / 60.0))
	}

	vdot := analytics.ComputeOpenVDOT(distM, durS, elevGainM)
	ef, z2Pace := analytics.ComputeZone2Metrics(distM, durS, elevGainM, avgHR)
	trimp := analytics.ComputeBanisterTRIMP(durS/60.0, avgHR, 51, maxInt(188, maxHR))

	title := customTitle
	if title == "" {
		if avgHR >= 156 {
			title = "Garmin Tempo Run (.FIT)"
		} else {
			title = "Garmin Aerobic Run (.FIT)"
		}
	}

	return &store.CardioActivity{
		ID:                sqlite.NewID(),
		UserID:            userID,
		StartedAt:         startedAt,
		LocalDate:         startedAt.Format("2006-01-02"),
		Title:             title,
		Sport:             sportStr,
		DistanceM:         math.Round(distM*10) / 10,
		DurationS:         math.Round(durS*10) / 10,
		AvgHR:             avgHR,
		MaxHR:             maxHR,
		AvgCadence:        avgCad,
		ElevationGainM:    elevGainM,
		VDOTOpen:          vdot,
		Zone2Efficiency:   ef,
		Zone2PaceSecPerMi: z2Pace,
		TRIMP:             trimp,
		Splits:            splits,
		HRZonesMinutes:    zonesMin,
		FitSHA256:         shaHex,
		Source:            "garmin_fit",
	}, nil
}

// BuildSampleRunFIT encodes a genuine Garmin FIT Protocol binary file in memory for testing & 1-click UI demo upload.
func BuildSampleRunFIT(startTime time.Time, mileDurationsSec []float64, mileHRs []int) ([]byte, error) {
	if startTime.IsZero() {
		startTime = time.Now().UTC().Add(-2 * time.Hour)
	}
	act := filedef.NewActivity()
	act.FileId = *mesgdef.NewFileId(nil).
		SetType(typedef.FileActivity).
		SetManufacturer(typedef.ManufacturerGarmin).
		SetProduct(3992). // Forerunner 255
		SetSerialNumber(3420897194).
		SetTimeCreated(startTime)

	curTS := startTime
	var totalDistM float64
	var totalDurS float64
	var hrWeighted float64
	maxHR := 0

	for i, dur := range mileDurationsSec {
		hr := 152
		if i < len(mileHRs) {
			hr = mileHRs[i]
		}
		if hr > maxHR {
			maxHR = hr
		}
		lapStart := curTS
		distM := 1609.344

		// Add 6 telemetry records per mile for HR zone reconstruction
		stepDur := dur / 6.0
		for r := 0; r < 6; r++ {
			curTS = curTS.Add(time.Duration(stepDur * float64(time.Second)))
			cumDist := totalDistM + distM*float64(r+1)/6.0
			rec := mesgdef.NewRecord(nil).
				SetTimestamp(curTS).
				SetDistance(uint32(math.Round(cumDist * 100))).
				SetHeartRate(uint8(hr)).
				SetCadence(uint8(91)) // 91 strides/min -> 182 spm
			act.Records = append(act.Records, rec)
		}

		lap := mesgdef.NewLap(nil).
			SetStartTime(lapStart).
			SetTimestamp(curTS).
			SetEvent(typedef.EventLap).
			SetEventType(typedef.EventTypeStop).
			SetTotalDistance(uint32(math.Round(distM * 100))).
			SetTotalTimerTime(uint32(math.Round(dur * 1000))).
			SetTotalElapsedTime(uint32(math.Round(dur * 1000))).
			SetAvgHeartRate(uint8(hr)).
			SetMaxHeartRate(uint8(hr + 5)).
			SetAvgCadence(uint8(91)).
			SetTotalAscent(uint16(12))
		act.Laps = append(act.Laps, lap)

		totalDistM += distM
		totalDurS += dur
		hrWeighted += float64(hr) * dur
	}

	avgHR := 150
	if totalDurS > 0 {
		avgHR = int(math.Round(hrWeighted / totalDurS))
	}

	sess := mesgdef.NewSession(nil).
		SetStartTime(startTime).
		SetTimestamp(curTS).
		SetSport(typedef.SportRunning).
		SetEvent(typedef.EventSession).
		SetEventType(typedef.EventTypeStop).
		SetTotalDistance(uint32(math.Round(totalDistM * 100))).
		SetTotalTimerTime(uint32(math.Round(totalDurS * 1000))).
		SetTotalElapsedTime(uint32(math.Round(totalDurS * 1000))).
		SetAvgHeartRate(uint8(avgHR)).
		SetMaxHeartRate(uint8(maxHR + 5)).
		SetAvgCadence(uint8(91)).
		SetTotalAscent(uint16(len(mileDurationsSec) * 12))
	act.Sessions = append(act.Sessions, sess)

	act.Activity = mesgdef.NewActivity(nil).
		SetTimestamp(curTS).
		SetNumSessions(1).
		SetType(typedef.ActivityManual).
		SetEvent(typedef.EventActivity).
		SetEventType(typedef.EventTypeStop)

	fitProto := act.ToFIT(nil)
	var buf bytes.Buffer
	enc := encoder.New(&buf)
	if err := enc.Encode(&fitProto); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// PollRecentActivities queries the official Oct 2026 Garmin Connect Personal API using GARMIN_PERSONAL_API_KEY.
func (s *Service) PollRecentActivities(ctx context.Context, userID string, now time.Time) (int, error) {
	if !s.Configured() {
		return 0, nil
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	url := fmt.Sprintf("%s/activities?limit=10", s.cfg.GarminBaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.GarminPersonalAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "activities", 0, err.Error(), nil)
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg := fmt.Sprintf("garmin personal api http %d", resp.StatusCode)
		_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "activities", resp.StatusCode, msg, nil)
		return 0, fmt.Errorf("%s", msg)
	}

	var list []struct {
		ActivityID   string `json:"activityId"`
		ActivityName string `json:"activityName"`
		FitDownload  string `json:"fitUrl"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		return 0, err
	}

	ingested := 0
	for _, item := range list {
		if item.FitDownload == "" {
			continue
		}
		fReq, err := http.NewRequestWithContext(ctx, http.MethodGet, item.FitDownload, nil)
		if err != nil {
			continue
		}
		fReq.Header.Set("Authorization", "Bearer "+s.cfg.GarminPersonalAPIKey)
		fResp, err := s.httpClient.Do(fReq)
		if err != nil || fResp.StatusCode != http.StatusOK {
			if fResp != nil {
				_ = fResp.Body.Close()
			}
			continue
		}
		raw, err := io.ReadAll(io.LimitReader(fResp.Body, 15<<20))
		_ = fResp.Body.Close()
		if err != nil {
			continue
		}
		act, err := DecodeFITBytes(userID, item.ActivityName, raw)
		if err != nil {
			continue
		}
		act.Source = "garmin_api"
		act.ExternalID = item.ActivityID
		if err := s.repo.UpsertCardioActivity(ctx, act); err == nil {
			ingested++
		}
	}

	_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "activities", http.StatusOK, "", &now)
	return ingested, nil
}

func normalizeRunCadence(cad int) int {
	// Garmin FIT stores running cadence in strides/min (~80-105 rpm -> 160-210 spm)
	if cad > 45 && cad < 125 {
		return cad * 2
	}
	return cad
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
