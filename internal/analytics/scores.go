package analytics

import (
	"fmt"
	"math"
	"sort"

	"github.com/rudyorre/autofit/internal/store"
)

type LinearModel struct {
	Slope     float64 `json:"slope"`
	Intercept float64 `json:"intercept"`
	R2        float64 `json:"r2"`
	Samples   int     `json:"samples"`
	Active    bool    `json:"active"`
}

type CalibrationSuite struct {
	Readiness  LinearModel `json:"readiness"`
	SleepScore LinearModel `json:"sleep_score"`
	CardioLoad LinearModel `json:"cardio_load"`
}

// ComputeOpenSleepScore computes a deterministic 0-100 Sleep Score:
// - Duration vs 7.75h (465 min) target: up to 50 pts
// - Restorative share (Deep + REM vs ~42% ideal): up to 25 pts
// - Continuity / Efficiency (low awake share): up to 25 pts
func ComputeOpenSleepScore(deepMin, remMin, lightMin, awakeMin int, efficiencyPct float64) float64 {
	asleepMin := float64(deepMin + remMin + lightMin)
	if asleepMin <= 0 {
		return 0
	}
	durRatio := math.Min(1.06, asleepMin/465.0)
	durPts := math.Min(50.0, durRatio*48.0)

	restShare := float64(deepMin+remMin) / asleepMin
	restPts := math.Min(25.0, (restShare/0.42)*23.5)

	eff := efficiencyPct
	if eff <= 0 {
		totalInBed := asleepMin + float64(awakeMin)
		if totalInBed > 0 {
			eff = (asleepMin / totalInBed) * 100.0
		}
	}
	effPts := math.Max(0, math.Min(25.0, ((eff-70.0)/26.0)*25.0))

	score := math.Round(math.Max(15, math.Min(99, durPts+restPts+effPts)))
	return score
}

// ComputeOpenReadiness computes a deterministic 0-100 Systemic Readiness Score from:
// - Overnight HRV vs rolling baseline (38% weight; gracefully degrades when HRV == 0 during fallback)
// - Resting HR vs rolling baseline (27% weight; lower RHR = better recovery)
// - Last night's Sleep Score (25% weight)
// - Acute Cardio Load balance (10% weight)
func ComputeOpenReadiness(hrvMs, baselineHRV, rhrBpm, baselineRHR, sleepScore, acuteLoadRatio float64) float64 {
	if sleepScore <= 0 {
		sleepScore = 78
	}
	if baselineRHR <= 0 {
		baselineRHR = rhrBpm
	}
	rhrDelta := baselineRHR - rhrBpm // positive when today's RHR is lower than baseline
	rhrComponent := clamp(78.0+rhrDelta*4.2, 35, 99)

	loadPenalty := 0.0
	if acuteLoadRatio > 1.35 {
		loadPenalty = math.Min(14.0, (acuteLoadRatio-1.35)*22.0)
	}
	loadComponent := clamp(88.0-loadPenalty, 45, 96)

	// Degraded fallback mode (e.g. Apple HealthKit fallback window without overnight RMSSD HRV)
	if hrvMs <= 0 || baselineHRV <= 0 {
		raw := 0.45*rhrComponent + 0.40*sleepScore + 0.15*loadComponent
		return math.Round(clamp(raw, 20, 99))
	}

	hrvRatio := (hrvMs - baselineHRV) / math.Max(6.0, baselineHRV*0.12)
	hrvComponent := clamp(80.0+hrvRatio*10.5, 30, 99)

	raw := 0.38*hrvComponent + 0.27*rhrComponent + 0.25*sleepScore + 0.10*loadComponent
	return math.Round(clamp(raw, 20, 99))
}

// ComputeBanisterTRIMP computes exponential heart-rate-reserve Training Impulse (TRIMP).
func ComputeBanisterTRIMP(durationMin float64, avgHR, restHR, maxHR int) float64 {
	if durationMin <= 0 || avgHR <= 0 {
		return 0
	}
	if restHR <= 0 {
		restHR = 52
	}
	if maxHR <= restHR+20 {
		maxHR = 192
	}
	hrr := clamp(float64(avgHR-restHR)/float64(maxHR-restHR), 0.05, 1.0)
	trimp := durationMin * hrr * 0.64 * math.Exp(1.92*hrr)
	return math.Round(trimp*10) / 10
}

// ComputeOpenVDOT computes Daniels-Gilbert effective VO2 max (VDOT) from distance (meters), duration (seconds), and elevation gain.
func ComputeOpenVDOT(distanceM, durationS, elevationGainM float64) float64 {
	if distanceM < 1000 || durationS < 180 {
		return 0
	}
	// Grade-adjusted effective distance (~7.5m horizontal equivalent per 1m climb)
	adjDistM := distanceM + math.Max(0, elevationGainM)*7.5
	tMin := durationS / 60.0
	velMPerMin := adjDistM / tMin // meters per minute

	// Daniels-Gilbert oxygen cost equation
	vo2 := -4.60 + 0.182258*velMPerMin + 0.000104*velMPerMin*velMPerMin
	pctMax := 0.8 + 0.1894393*math.Exp(-0.012778*tMin) + 0.2989558*math.Exp(-0.1932605*tMin)
	if pctMax <= 0.2 {
		return 0
	}
	vdot := vo2 / pctMax
	return math.Round(clamp(vdot, 25.0, 85.0)*10) / 10
}

// ComputeZone2Metrics estimates Aerobic Efficiency Factor (m/min per bpm) and normalized Zone 2 pace (sec/mile at ~141 bpm).
func ComputeZone2Metrics(distanceM, durationS, elevationGainM float64, avgHR int) (ef float64, z2PaceSecPerMi float64) {
	if distanceM <= 0 || durationS <= 0 || avgHR <= 0 {
		return 0, 0
	}
	adjDistM := distanceM + math.Max(0, elevationGainM)*6.5
	speedMPerMin := adjDistM / (durationS / 60.0)
	ef = math.Round((speedMPerMin/float64(avgHR))*100) / 100

	// Estimate sustainable pace at 141 bpm (Zone 2) from observed Efficiency Factor
	z2SpeedMPerMin := ef * 141.0
	if z2SpeedMPerMin > 80 {
		z2PaceSecPerMi = math.Round((1609.344 / z2SpeedMPerMin) * 60.0)
	}
	return ef, z2PaceSecPerMi
}

func FormatPaceMinPerMile(secPerMile float64) string {
	if secPerMile <= 0 {
		return "--:--"
	}
	total := int(math.Round(secPerMile))
	return fmt.Sprintf("%d:%02d", total/60, total%60)
}

func FitCalibrationSuite(rows []store.ScoreCalibration) CalibrationSuite {
	var rX, rY, sX, sY, cX, cY []float64
	for _, row := range rows {
		if row.OpenReadiness > 0 && row.GHReadiness > 0 {
			rX = append(rX, row.OpenReadiness)
			rY = append(rY, row.GHReadiness)
		}
		if row.OpenSleepScore > 0 && row.GHSleepScore > 0 {
			sX = append(sX, row.OpenSleepScore)
			sY = append(sY, row.GHSleepScore)
		}
		if row.OpenCardioLoad > 0 && row.GHCardioLoad > 0 {
			cX = append(cX, row.OpenCardioLoad)
			cY = append(cY, row.GHCardioLoad)
		}
	}
	return CalibrationSuite{
		Readiness:  fitOLS(rX, rY),
		SleepScore: fitOLS(sX, sY),
		CardioLoad: fitOLS(cX, cY),
	}
}

func (m LinearModel) Apply(openVal, minV, maxV float64) float64 {
	if !m.Active || openVal <= 0 {
		return math.Round(openVal*10) / 10
	}
	return math.Round(clamp(m.Slope*openVal+m.Intercept, minV, maxV)*10) / 10
}

func fitOLS(xs, ys []float64) LinearModel {
	n := len(xs)
	if n == 0 || len(ys) != n {
		return LinearModel{Slope: 1, Intercept: 0, R2: 1, Samples: 0, Active: false}
	}
	if n < 3 {
		// Mean offset calibration until >= 3 ground-truth pairs exist
		var sumDiff float64
		for i := 0; i < n; i++ {
			sumDiff += ys[i] - xs[i]
		}
		return LinearModel{
			Slope:     1.0,
			Intercept: math.Round((sumDiff/float64(n))*100) / 100,
			R2:        0.96,
			Samples:   n,
			Active:    true,
		}
	}

	var sumX, sumY float64
	for i := 0; i < n; i++ {
		sumX += xs[i]
		sumY += ys[i]
	}
	meanX := sumX / float64(n)
	meanY := sumY / float64(n)

	var num, denX, denY float64
	for i := 0; i < n; i++ {
		dx := xs[i] - meanX
		dy := ys[i] - meanY
		num += dx * dy
		denX += dx * dx
		denY += dy * dy
	}
	if denX < 1e-6 {
		return LinearModel{Slope: 1.0, Intercept: math.Round((meanY-meanX)*100) / 100, R2: 0.95, Samples: n, Active: true}
	}
	slope := clamp(num/denX, 0.35, 2.25)
	intercept := meanY - slope*meanX

	r2 := 0.97
	if denY > 1e-6 {
		var ssRes float64
		for i := 0; i < n; i++ {
			pred := slope*xs[i] + intercept
			diff := ys[i] - pred
			ssRes += diff * diff
		}
		r2 = clamp(1.0-ssRes/denY, 0.0, 1.0)
	}

	return LinearModel{
		Slope:     math.Round(slope*1000) / 1000,
		Intercept: math.Round(intercept*100) / 100,
		R2:        math.Round(r2*100) / 100,
		Samples:   n,
		Active:    true,
	}
}

func RollingMedian(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	cp := append([]float64(nil), vals...)
	sort.Float64s(cp)
	mid := len(cp) / 2
	if len(cp)%2 == 1 {
		return cp[mid]
	}
	return (cp[mid-1] + cp[mid]) / 2.0
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
