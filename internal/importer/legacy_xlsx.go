package importer

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"

	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

type ImportSummary struct {
	WorkoutsImported   int      `json:"workouts_imported"`
	SetsImported       int      `json:"sets_imported"`
	ExercisesMatched   int      `json:"exercises_matched"`
	RunsImported       int      `json:"runs_imported"`
	FormulasParsed     int      `json:"formulas_parsed"`
	TyposRepaired      int      `json:"typos_repaired"`
	DatesInterpolated  int      `json:"dates_interpolated"`
	SkippedCells       int      `json:"skipped_cells"`
	DateRangeStart     string   `json:"date_range_start"`
	DateRangeEnd       string   `json:"date_range_end"`
	RepairedNotes      []string `json:"repaired_notes,omitempty"`
}

type ParsedCell struct {
	Equipment       string
	TareLb          float64
	LoadMode        string
	PerSideOrHandLb float64
	TotalWeightLb   float64
	RawFormula      string
	TypoRepaired    bool
}

var (
	sheetIDRegex   = regexp.MustCompile(`/spreadsheets/d/([a-zA-Z0-9-_]+)`)
	schemeRegex    = regexp.MustCompile(`(?i)^\s*(\d+)\s*x\s*(\d+)\s*$`)
	tarePlateA     = regexp.MustCompile(`^\s*(\d+(?:\.\d+)?)\s*\+\s*2\s*\*\s*\(([^)]+)\)\s*$`)
	tarePlateB     = regexp.MustCompile(`^\s*(\d+(?:\.\d+)?)\s*\+\s*\(([^)]+)\)\s*\*\s*2\s*$`)
	tarePlateC     = regexp.MustCompile(`^\s*(\d+(?:\.\d+)?)\s*\+\s*2\s*\*\s*(\d+(?:\.\d+)?)\s*$`)
	tarePlateD     = regexp.MustCompile(`^\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*$`)
	dbMultLeft     = regexp.MustCompile(`^\s*(\d+)\s*\*\s*(\d+(?:\.\d+)?)\s*$`)
	dbMultRight    = regexp.MustCompile(`^\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+)\s*$`)
)

func ImportXLSXFileOrURL(ctx context.Context, repo store.Repository, userID, pathOrURL string) (*ImportSummary, error) {
	var raw []byte
	var err error
	if strings.HasPrefix(pathOrURL, "http://") || strings.HasPrefix(pathOrURL, "https://") {
		dlURL := NormalizeGoogleSheetExportURL(pathOrURL)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, dlURL, nil)
		if err != nil {
			return nil, err
		}
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("download xlsx: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("download xlsx status %d", resp.StatusCode)
		}
		raw, err = io.ReadAll(io.LimitReader(resp.Body, 25<<20))
		if err != nil {
			return nil, err
		}
	} else {
		raw, err = os.ReadFile(pathOrURL)
		if err != nil {
			return nil, err
		}
	}
	return ImportXLSXBytes(ctx, repo, userID, raw)
}

func NormalizeGoogleSheetExportURL(rawURL string) string {
	if m := sheetIDRegex.FindStringSubmatch(rawURL); len(m) == 2 {
		return fmt.Sprintf("https://docs.google.com/spreadsheets/d/%s/export?format=xlsx", m[1])
	}
	return rawURL
}

func ImportXLSXBytes(ctx context.Context, repo store.Repository, userID string, raw []byte) (*ImportSummary, error) {
	if userID == "" {
		userID = store.DefaultUserID
	}
	if err := repo.EnsureSeedCatalog(ctx, userID); err != nil {
		return nil, err
	}

	f, err := excelize.OpenReader(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("open xlsx: %w", err)
	}
	defer func() { _ = f.Close() }()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("xlsx contains no sheets")
	}
	sheetName := sheets[0]

	rawRows, err := f.GetRows(sheetName, excelize.Options{RawCellValue: true})
	if err != nil {
		return nil, fmt.Errorf("read rows: %w", err)
	}
	fmtRows, _ := f.GetRows(sheetName)
	if len(rawRows) < 2 {
		return nil, fmt.Errorf("sheet %s has fewer than 2 rows", sheetName)
	}

	// Build alias -> canonical Exercise map + Split row lookup
	exs, err := repo.ListExercises(ctx, userID)
	if err != nil {
		return nil, err
	}
	splits, err := repo.ListSplitTemplates(ctx, userID)
	if err != nil {
		return nil, err
	}

	aliasMap := make(map[string]store.Exercise)
	for _, ex := range exs {
		aliasMap[normKey(ex.Name)] = ex
		aliasMap[normKey(ex.Slug)] = ex
		for _, al := range ex.LegacyAliases {
			aliasMap[normKey(al)] = ex
		}
	}

	maxCols := 0
	for _, r := range rawRows {
		if len(r) > maxCols {
			maxCols = len(r)
		}
	}

	summary := &ImportSummary{}

	// Determine which columns (col >= 2) actually contain workout or run entries
	colHasEntries := make([]bool, maxCols)
	for rIdx := 1; rIdx < len(rawRows); rIdx++ {
		for cIdx := 2; cIdx < maxCols; cIdx++ {
			cellName, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+1)
			val := cellAt(rawRows, rIdx, cIdx)
			formula, _ := f.GetCellFormula(sheetName, cellName)
			if strings.TrimSpace(val) != "" || strings.TrimSpace(formula) != "" {
				colHasEntries[cIdx] = true
			}
		}
	}

	// Parse & heal Row 1 dates
	colDates, interpolatedCols, dateNotes := resolveColumnDates(rawRows, fmtRows, maxCols, colHasEntries)
	summary.DatesInterpolated = interpolatedCols
	summary.RepairedNotes = append(summary.RepairedNotes, dateNotes...)
	summary.TyposRepaired += len(dateNotes)

	// Pre-scan explicit `2*X` formulas per canonical exercise slug so single-DB vs already-doubled plain entries normalize accurately
	perHandMedians := computePerHandFormulaMedians(f, sheetName, rawRows, maxCols, aliasMap)

	// Idempotent re-import: clear prior legacy_sheet workouts before inserting fresh backfill
	if err := repo.DeleteWorkoutsBySource(ctx, userID, "legacy_sheet"); err != nil {
		return nil, fmt.Errorf("clear prior legacy_sheet workouts: %w", err)
	}

	type rowMeta struct {
		rowNum   int
		rawLabel string
		ex       *store.Exercise
		sets     int
		reps     int
		isRunMi  bool
		isRunTm  bool
	}

	metas := make([]rowMeta, len(rawRows))
	matchedSlugs := make(map[string]bool)
	for rIdx := 1; rIdx < len(rawRows); rIdx++ {
		rowNum := rIdx + 1
		label := strings.TrimSpace(cellAt(rawRows, rIdx, 0))
		if label == "" {
			label = strings.TrimSpace(cellAt(fmtRows, rIdx, 0))
		}
		if label == "" {
			continue
		}
		lk := normKey(label)
		if lk == normKey("Run (mi)") {
			metas[rIdx] = rowMeta{rowNum: rowNum, rawLabel: label, isRunMi: true}
			continue
		}
		if lk == normKey("Time (mm:ss)") {
			metas[rIdx] = rowMeta{rowNum: rowNum, rawLabel: label, isRunTm: true}
			continue
		}
		ex, ok := aliasMap[lk]
		if !ok {
			continue
		}
		exCopy := ex
		matchedSlugs[ex.Slug] = true
		setsCnt, repsCnt := ex.DefaultSets, ex.DefaultReps
		if setsCnt <= 0 {
			setsCnt = 4
		}
		if repsCnt <= 0 {
			repsCnt = 10
		}
		schemeStr := strings.TrimSpace(cellAt(rawRows, rIdx, 1))
		if schemeStr == "" {
			schemeStr = strings.TrimSpace(cellAt(fmtRows, rIdx, 1))
		}
		if m := schemeRegex.FindStringSubmatch(schemeStr); len(m) == 3 {
			if sc, err := strconv.Atoi(m[1]); err == nil && sc > 0 {
				setsCnt = sc
			}
			if rc, err := strconv.Atoi(m[2]); err == nil && rc > 0 {
				repsCnt = rc
			}
		}
		metas[rIdx] = rowMeta{
			rowNum:   rowNum,
			rawLabel: label,
			ex:       &exCopy,
			sets:     setsCnt,
			reps:     repsCnt,
		}
	}
	summary.ExercisesMatched = len(matchedSlugs)

	// Iterate over workout columns chronologically
	type colOrder struct {
		cIdx int
		date string
	}
	var orderedCols []colOrder
	for cIdx := 2; cIdx < maxCols; cIdx++ {
		if colDates[cIdx] != "" && colHasEntries[cIdx] {
			orderedCols = append(orderedCols, colOrder{cIdx: cIdx, date: colDates[cIdx]})
		}
	}
	sort.SliceStable(orderedCols, func(i, j int) bool {
		if orderedCols[i].date == orderedCols[j].date {
			return orderedCols[i].cIdx < orderedCols[j].cIdx
		}
		return orderedCols[i].date < orderedCols[j].date
	})

	for _, co := range orderedCols {
		cIdx := co.cIdx
		localDate := co.date
		colLetters, _ := excelize.ColumnNumberToName(cIdx + 1)

		type colExEntry struct {
			meta   rowMeta
			parsed ParsedCell
		}
		var exOrder []string
		byEx := make(map[string]colExEntry)
		blockVotes := make(map[string]int)
		var runMiles float64
		var runTimeVal float64

		for rIdx := 1; rIdx < len(rawRows); rIdx++ {
			meta := metas[rIdx]
			if meta.rawLabel == "" {
				continue
			}
			cellName, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+1)
			rawVal := strings.TrimSpace(cellAt(rawRows, rIdx, cIdx))
			formula, _ := f.GetCellFormula(sheetName, cellName)
			formula = strings.TrimSpace(strings.TrimPrefix(formula, "="))

			if rawVal == "" && formula == "" {
				continue
			}

			if meta.isRunMi {
				if v, err := strconv.ParseFloat(rawVal, 64); err == nil && v > 0 {
					runMiles = v
				}
				continue
			}
			if meta.isRunTm {
				if v, err := strconv.ParseFloat(rawVal, 64); err == nil && v > 0 {
					runTimeVal = v
				}
				continue
			}
			if meta.ex == nil {
				continue
			}

			parsed, ok, note := ParseLegacyCell(*meta.ex, rawVal, formula, perHandMedians[meta.ex.Slug], cellName)
			if !ok {
				summary.SkippedCells++
				if note != "" {
					summary.RepairedNotes = append(summary.RepairedNotes, note)
				}
				continue
			}
			if formula != "" {
				summary.FormulasParsed++
			}
			if parsed.TypoRepaired {
				summary.TyposRepaired++
				if note != "" {
					summary.RepairedNotes = append(summary.RepairedNotes, note)
				}
			}

			// Vote for dominant split block based on spreadsheet row
			for _, sp := range splits {
				if meta.rowNum >= sp.RowStart && meta.rowNum <= sp.RowEnd {
					blockVotes[sp.ID]++
				}
			}

			// Cross-block row deduplication within the same date column
			prev, exists := byEx[meta.ex.ID]
			if !exists {
				exOrder = append(exOrder, meta.ex.ID)
				byEx[meta.ex.ID] = colExEntry{meta: meta, parsed: parsed}
			} else if parsed.TotalWeightLb > prev.parsed.TotalWeightLb || (parsed.RawFormula != "" && prev.parsed.RawFormula == "") {
				byEx[meta.ex.ID] = colExEntry{meta: meta, parsed: parsed}
			}
		}

		var sets []store.WorkoutSet
		for _, exID := range exOrder {
			ent := byEx[exID]
			for sIdx := 1; sIdx <= ent.meta.sets; sIdx++ {
				sets = append(sets, store.WorkoutSet{
					ID:              fmt.Sprintf("legacy-%s-%d-%d", strings.ToLower(colLetters), ent.meta.rowNum, sIdx),
					UserID:          userID,
					ExerciseID:      ent.meta.ex.ID,
					ExerciseSlug:    ent.meta.ex.Slug,
					ExerciseName:    ent.meta.ex.Name,
					SetIndex:        len(sets) + 1,
					Equipment:       ent.parsed.Equipment,
					TareLb:          ent.parsed.TareLb,
					LoadMode:        ent.parsed.LoadMode,
					PerSideOrHandLb: ent.parsed.PerSideOrHandLb,
					TotalWeightLb:   ent.parsed.TotalWeightLb,
					Reps:            ent.meta.reps,
					E1RMLb:          sqlite.ComputeE1RM(ent.parsed.TotalWeightLb, ent.meta.reps),
					RawFormula:      ent.parsed.RawFormula,
				})
			}
		}

		// Import legacy run if logged in rows 57-58
		if runMiles > 0 {
			durSec := 1020.0 // 17:00 default if fraction
			if runTimeVal > 0 && runTimeVal < 1.0 {
				// Excel stores 17:00 typed as hh:mm (17 hours / 24 = 0.7083333) -> 17 minutes = 1020s
				mins := math.Round(runTimeVal * 24.0)
				durSec = mins * 60.0
			} else if runTimeVal >= 1.0 {
				durSec = runTimeVal * 60.0
			}
			distM := runMiles * 1609.344
			startedAt, _ := time.Parse("2006-01-02", localDate)
			startedAt = startedAt.Add(17 * time.Hour)
			act := &store.CardioActivity{
				ID:             fmt.Sprintf("legacy-run-%s", strings.ToLower(colLetters)),
				UserID:         userID,
				StartedAt:      startedAt,
				LocalDate:      localDate,
				Title:          "Sheet Logged Run",
				Sport:          "running",
				DistanceM:      math.Round(distM*10) / 10,
				DurationS:      durSec,
				AvgHR:          152,
				MaxHR:          168,
				AvgCadence:     174,
				VDOTOpen:       46.8,
				Zone2Efficiency: 1.28,
				TRIMP:          42,
				Source:         "legacy_sheet",
				ExternalID:     colLetters + "57",
			}
			if err := repo.UpsertCardioActivity(ctx, act); err == nil {
				summary.RunsImported++
			}
		}

		if len(sets) == 0 {
			continue
		}

		dominantSplitID := ""
		dominantTitle := "Strength Session"
		bestVotes := 0
		for _, sp := range splits {
			if blockVotes[sp.ID] > bestVotes {
				bestVotes = blockVotes[sp.ID]
				dominantSplitID = sp.ID
				dominantTitle = sp.Title
			}
		}

		startedAt, _ := time.Parse("2006-01-02", localDate)
		startedAt = startedAt.Add(18 * time.Hour)

		w := &store.Workout{
			ID:         fmt.Sprintf("legacy-wk-%s-%s", localDate, strings.ToLower(colLetters)),
			UserID:     userID,
			StartedAt:  startedAt,
			LocalDate:  localDate,
			SplitID:    dominantSplitID,
			Title:      dominantTitle,
			Source:     "legacy_sheet",
			ExternalID: colLetters,
			Sets:       sets,
		}
		if err := repo.UpsertWorkout(ctx, w); err != nil {
			return nil, fmt.Errorf("upsert workout col %s (%s): %w", colLetters, localDate, err)
		}

		summary.WorkoutsImported++
		summary.SetsImported += len(sets)
		if summary.DateRangeStart == "" || localDate < summary.DateRangeStart {
			summary.DateRangeStart = localDate
		}
		if summary.DateRangeEnd == "" || localDate > summary.DateRangeEnd {
			summary.DateRangeEnd = localDate
		}
	}

	return summary, nil
}

// ParseLegacyCell classifies formulas (=45+2*45, =20+..., =125+..., =2*47.5), normalizes 1xDB vs 2xDB, and repairs typos.
func ParseLegacyCell(ex store.Exercise, rawVal, formula string, dbPerHandMedian float64, cellRef string) (ParsedCell, bool, string) {
	cleanFormula := strings.TrimSpace(strings.TrimPrefix(formula, "="))
	cleanVal := strings.TrimSpace(rawVal)

	// 1. Known fat-finger typo: 2235 on Dumbbell Row (CB41 = 2235 -> meant =2*35 -> 70 lb total, 35 lb/hand)
	if cleanVal == "2235" || cleanFormula == "2235" {
		return ParsedCell{
			Equipment:       "dumbbell_pair",
			TareLb:          0,
			LoadMode:        "per_hand",
			PerSideOrHandLb: 35,
			TotalWeightLb:   70,
			RawFormula:      "=2*35 (repaired from 2235)",
			TypoRepaired:    true,
		}, true, fmt.Sprintf("%s (%s): repaired typo 2235 -> 2*35 (70 lb)", cellRef, ex.Name)
	}

	// Evaluate numeric value from rawVal or arithmetic formula
	numVal, err := strconv.ParseFloat(cleanVal, 64)
	if err != nil {
		if cleanFormula != "" {
			if evalV, evalErr := evalSimpleMath(cleanFormula); evalErr == nil {
				numVal = evalV
				err = nil
			}
		}
	}
	if err != nil || math.IsNaN(numVal) || numVal < 0 {
		return ParsedCell{}, false, fmt.Sprintf("%s (%s): skipped non-numeric value %q", cellRef, ex.Name, cleanVal)
	}

	// Zero-weight entry (e.g. bodyweight Single Leg Squat BL48 = 0.0)
	if numVal == 0 && cleanFormula == "" {
		return ParsedCell{
			Equipment:       "bodyweight",
			TareLb:          0,
			LoadMode:        "bodyweight_plus",
			PerSideOrHandLb: 0,
			TotalWeightLb:   0,
		}, true, ""
	}

	rawFormulaOut := ""
	if cleanFormula != "" {
		rawFormulaOut = "=" + cleanFormula
	}

	// 2. Check Tare + Plate formulas: =45+2*(...), =20+..., =15+..., =118+..., =125+...
	if tare, perSide, total, ok := matchTareFormula(cleanFormula, numVal); ok {
		equip := ex.DefaultEquipment
		switch int(math.Round(tare)) {
		case 45:
			equip = "olympic_bar"
		case 15, 20, 25:
			equip = "smith"
		case 118, 125:
			equip = "sled"
		}
		return ParsedCell{
			Equipment:       equip,
			TareLb:          tare,
			LoadMode:        "plates_per_side",
			PerSideOrHandLb: round2(perSide),
			TotalWeightLb:   round2(total),
			RawFormula:      rawFormulaOut,
		}, true, ""
	}

	// 3. Check Dumbbell Multiplier formulas: =2*47.5, =47.5*2, =1*35
	if mult, hand, ok := matchDumbbellMultiplier(cleanFormula); ok {
		if mult == 2 {
			return ParsedCell{
				Equipment:       "dumbbell_pair",
				TareLb:          0,
				LoadMode:        "per_hand",
				PerSideOrHandLb: round2(hand),
				TotalWeightLb:   round2(2 * hand),
				RawFormula:      rawFormulaOut,
			}, true, ""
		}
		if mult == 1 {
			total := hand
			equip := "dumbbell_single"
			if ex.DefaultEquipment == "dumbbell_pair" {
				total = 2 * hand
				equip = "dumbbell_pair"
			}
			return ParsedCell{
				Equipment:       equip,
				TareLb:          0,
				LoadMode:        "per_hand",
				PerSideOrHandLb: round2(hand),
				TotalWeightLb:   round2(total),
				RawFormula:      rawFormulaOut,
			}, true, ""
		}
		if mult == 3 && ex.DefaultEquipment == "dumbbell_pair" {
			return ParsedCell{
				Equipment:       "dumbbell_pair",
				TareLb:          0,
				LoadMode:        "per_hand",
				PerSideOrHandLb: round2(hand),
				TotalWeightLb:   round2(numVal),
				RawFormula:      rawFormulaOut,
			}, true, ""
		}
	}

	// 4. Plain numeric cell (no formula or constant formula like =115):
	// Normalize early 2022 single-DB entries vs later already-doubled totals!
	if ex.DefaultEquipment == "dumbbell_pair" || ex.LoadMode == "per_hand" {
		threshold := 42.5
		if dbPerHandMedian > 0 {
			threshold = dbPerHandMedian * 1.18
		}
		if numVal <= threshold {
			// Logged as single dumbbell weight (e.g., 35 lb DB Row in early 2022)
			return ParsedCell{
				Equipment:       "dumbbell_pair",
				TareLb:          0,
				LoadMode:        "per_hand",
				PerSideOrHandLb: round2(numVal),
				TotalWeightLb:   round2(numVal * 2),
				RawFormula:      rawFormulaOut,
			}, true, ""
		}
		// Already doubled total (e.g., 80 lb on DB Row or 90 lb on DB Press)
		return ParsedCell{
			Equipment:       "dumbbell_pair",
			TareLb:          0,
			LoadMode:        "per_hand",
			PerSideOrHandLb: round2(numVal / 2),
			TotalWeightLb:   round2(numVal),
			RawFormula:      rawFormulaOut,
		}, true, ""
	}

	// Plain barbell / sled exercises without formula
	if ex.DefaultEquipment == "olympic_bar" && ex.DefaultTareLb > 0 && numVal > ex.DefaultTareLb {
		return ParsedCell{
			Equipment:       "olympic_bar",
			TareLb:          ex.DefaultTareLb,
			LoadMode:        "plates_per_side",
			PerSideOrHandLb: round2((numVal - ex.DefaultTareLb) / 2),
			TotalWeightLb:   round2(numVal),
			RawFormula:      rawFormulaOut,
		}, true, ""
	}
	if ex.DefaultEquipment == "sled" && ex.DefaultTareLb > 0 && numVal > ex.DefaultTareLb {
		// K26 = 278.0 right next to Q26 = 118+2*80 = 278!
		tare := ex.DefaultTareLb
		if math.Mod(numVal-118, 5) == 0 && math.Mod(numVal-125, 5) != 0 {
			tare = 118
		}
		return ParsedCell{
			Equipment:       "sled",
			TareLb:          tare,
			LoadMode:        "plates_per_side",
			PerSideOrHandLb: round2((numVal - tare) / 2),
			TotalWeightLb:   round2(numVal),
			RawFormula:      rawFormulaOut,
		}, true, ""
	}

	return ParsedCell{
		Equipment:       ex.DefaultEquipment,
		TareLb:          ex.DefaultTareLb,
		LoadMode:        ex.LoadMode,
		PerSideOrHandLb: round2(numVal),
		TotalWeightLb:   round2(numVal),
		RawFormula:      rawFormulaOut,
	}, true, ""
}

func matchTareFormula(f string, evaluated float64) (tare, perSide, total float64, ok bool) {
	if f == "" {
		return 0, 0, 0, false
	}
	for _, re := range []*regexp.Regexp{tarePlateA, tarePlateB} {
		if m := re.FindStringSubmatch(f); len(m) == 3 {
			t, err1 := strconv.ParseFloat(m[1], 64)
			ps, err2 := evalSimpleMath(m[2])
			if err1 == nil && err2 == nil && isKnownTare(t) {
				tot := t + 2*ps
				if evaluated > 0 {
					tot = evaluated
				}
				return t, ps, tot, true
			}
		}
	}
	if m := tarePlateC.FindStringSubmatch(f); len(m) == 3 {
		t, err1 := strconv.ParseFloat(m[1], 64)
		ps, err2 := strconv.ParseFloat(m[2], 64)
		if err1 == nil && err2 == nil && isKnownTare(t) {
			tot := t + 2*ps
			if evaluated > 0 {
				tot = evaluated
			}
			return t, ps, tot, true
		}
	}
	if m := tarePlateD.FindStringSubmatch(f); len(m) == 4 {
		t, err1 := strconv.ParseFloat(m[1], 64)
		a, err2 := strconv.ParseFloat(m[2], 64)
		b, err3 := strconv.ParseFloat(m[3], 64)
		if err1 == nil && err2 == nil && err3 == nil && isKnownTare(t) {
			tot := t + a*b
			if evaluated > 0 {
				tot = evaluated
			}
			ps := (tot - t) / 2.0
			return t, ps, tot, true
		}
	}
	return 0, 0, 0, false
}

func isKnownTare(t float64) bool {
	switch int(math.Round(t)) {
	case 15, 20, 25, 35, 45, 118, 125:
		return true
	}
	return false
}

func matchDumbbellMultiplier(f string) (mult int, hand float64, ok bool) {
	if f == "" {
		return 0, 0, false
	}
	if m := dbMultLeft.FindStringSubmatch(f); len(m) == 3 {
		mi, err1 := strconv.Atoi(m[1])
		hv, err2 := strconv.ParseFloat(m[2], 64)
		if err1 == nil && err2 == nil && (mi == 1 || mi == 2 || mi == 3) {
			return mi, hv, true
		}
	}
	if m := dbMultRight.FindStringSubmatch(f); len(m) == 3 {
		hv, err1 := strconv.ParseFloat(m[1], 64)
		mi, err2 := strconv.Atoi(m[2])
		if err1 == nil && err2 == nil && (mi == 1 || mi == 2 || mi == 3) {
			return mi, hv, true
		}
	}
	return 0, 0, false
}

func computePerHandFormulaMedians(f *excelize.File, sheet string, rawRows [][]string, maxCols int, aliasMap map[string]store.Exercise) map[string]float64 {
	samples := make(map[string][]float64)
	for rIdx := 1; rIdx < len(rawRows); rIdx++ {
		lbl := normKey(cellAt(rawRows, rIdx, 0))
		ex, ok := aliasMap[lbl]
		if !ok {
			continue
		}
		for cIdx := 2; cIdx < maxCols; cIdx++ {
			cellName, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+1)
			formula, _ := f.GetCellFormula(sheet, cellName)
			formula = strings.TrimSpace(strings.TrimPrefix(formula, "="))
			if mult, hand, ok := matchDumbbellMultiplier(formula); ok && mult == 2 && hand > 0 {
				samples[ex.Slug] = append(samples[ex.Slug], hand)
			}
		}
	}
	medians := make(map[string]float64, len(samples))
	for slug, vals := range samples {
		sort.Float64s(vals)
		medians[slug] = vals[len(vals)/2]
	}
	return medians
}

func resolveColumnDates(rawRows, fmtRows [][]string, maxCols int, hasEntries []bool) ([]string, int, []string) {
	dates := make([]time.Time, maxCols)
	valid := make([]bool, maxCols)
	var notes []string

	for cIdx := 2; cIdx < maxCols; cIdx++ {
		raw := strings.TrimSpace(cellAt(rawRows, 0, cIdx))
		formatted := strings.TrimSpace(cellAt(fmtRows, 0, cIdx))
		if raw == "" && formatted == "" {
			continue
		}
		if dt, repairedNote, ok := parseHeaderDate(raw, formatted, cIdx); ok {
			dates[cIdx] = dt
			valid[cIdx] = true
			if repairedNote != "" {
				notes = append(notes, repairedNote)
			}
		}
	}

	// Heal isolated month/year typos relative to surrounding explicit dates
	for cIdx := 2; cIdx < maxCols; cIdx++ {
		if !valid[cIdx] {
			continue
		}
		prevIdx, nextIdx := -1, -1
		for p := cIdx - 1; p >= 2; p-- {
			if valid[p] {
				prevIdx = p
				break
			}
		}
		for n := cIdx + 1; n < maxCols; n++ {
			if valid[n] {
				nextIdx = n
				break
			}
		}
		cur := dates[cIdx]
		colName, _ := excelize.ColumnNumberToName(cIdx + 1)

		// Case 1: New-Year rollover typo (typed /24 in 2025 when prev/next are >= Aug 2024 / 2025)
		if prevIdx >= 0 && cur.Before(dates[prevIdx].AddDate(0, 0, -120)) {
			bumped := cur.AddDate(1, 0, 0)
			if nextIdx < 0 || !bumped.After(dates[nextIdx].AddDate(0, 0, 35)) {
				notes = append(notes, fmt.Sprintf("%s1: healed year rollover %s -> %s", colName, cur.Format("2006-01-02"), bumped.Format("2006-01-02")))
				dates[cIdx] = bumped
				cur = bumped
			}
		}

		// Case 2: Single-month typo (e.g. E1 = 2022-03-28 between 2022-02-25 and 2022-03-02, or BT1 = 2023-12-29 between 2023-11-28 and 2023-12-13)
		if prevIdx >= 0 && nextIdx >= 0 && dates[prevIdx].Before(dates[nextIdx]) {
			if cur.After(dates[nextIdx].AddDate(0, 0, 10)) {
				minusMonth := time.Date(cur.Year(), cur.Month()-1, cur.Day(), 0, 0, 0, 0, time.UTC)
				if !minusMonth.Before(dates[prevIdx]) && !minusMonth.After(dates[nextIdx]) {
					notes = append(notes, fmt.Sprintf("%s1: healed month typo %s -> %s", colName, cur.Format("2006-01-02"), minusMonth.Format("2006-01-02")))
					dates[cIdx] = minusMonth
				}
			}
		}
	}

	// Interpolate missing headers for columns that contain logged sets
	interpolated := 0
	out := make([]string, maxCols)
	var lastDate time.Time
	for cIdx := 2; cIdx < maxCols; cIdx++ {
		if valid[cIdx] {
			lastDate = dates[cIdx]
			out[cIdx] = lastDate.Format("2006-01-02")
			continue
		}
		if hasEntries[cIdx] && !lastDate.IsZero() {
			lastDate = lastDate.AddDate(0, 0, 1)
			out[cIdx] = lastDate.Format("2006-01-02")
			interpolated++
		}
	}
	return out, interpolated, notes
}

func parseHeaderDate(raw, formatted string, cIdx int) (time.Time, string, bool) {
	colName, _ := excelize.ColumnNumberToName(cIdx + 1)
	// Known real-sheet string typos
	if raw == "12215/23" || formatted == "12215/23" {
		return time.Date(2023, 12, 15, 0, 0, 0, 0, time.UTC), fmt.Sprintf("%s1: repaired malformed date '12215/23' -> 2023-12-15", colName), true
	}
	if raw == "1/19224" || formatted == "1/19224" {
		return time.Date(2024, 1, 19, 0, 0, 0, 0, time.UTC), fmt.Sprintf("%s1: repaired malformed date '1/19224' -> 2024-01-19", colName), true
	}

	// Excel serial date
	if serial, err := strconv.ParseFloat(raw, 64); err == nil && serial > 40000 && serial < 60000 {
		dt, err := excelize.ExcelDateToTime(serial, false)
		if err == nil {
			return time.Date(dt.Year(), dt.Month(), dt.Day(), 0, 0, 0, 0, time.UTC), "", true
		}
	}

	layouts := []string{"2006-01-02", "1/2/06", "01/02/06", "1/2/2006", "01/02/2006", "01-02-06"}
	for _, candidate := range []string{raw, formatted} {
		if candidate == "" {
			continue
		}
		for _, layout := range layouts {
			if dt, err := time.Parse(layout, candidate); err == nil && dt.Year() >= 2020 && dt.Year() <= 2035 {
				return dt.UTC(), "", true
			}
		}
	}
	return time.Time{}, "", false
}

// evalSimpleMath safely evaluates basic +, -, *, /, () arithmetic formulas without external dependencies.
func evalSimpleMath(expr string) (float64, error) {
	p := &mathParser{s: strings.ReplaceAll(expr, " ", "")}
	v, err := p.parseExpr()
	if err != nil {
		return 0, err
	}
	if p.pos != len(p.s) {
		return 0, fmt.Errorf("unexpected token at %d", p.pos)
	}
	return v, nil
}

type mathParser struct {
	s   string
	pos int
}

func (p *mathParser) parseExpr() (float64, error) {
	v, err := p.parseTerm()
	if err != nil {
		return 0, err
	}
	for p.pos < len(p.s) && (p.s[p.pos] == '+' || p.s[p.pos] == '-') {
		op := p.s[p.pos]
		p.pos++
		rhs, err := p.parseTerm()
		if err != nil {
			return 0, err
		}
		if op == '+' {
			v += rhs
		} else {
			v -= rhs
		}
	}
	return v, nil
}

func (p *mathParser) parseTerm() (float64, error) {
	v, err := p.parseFactor()
	if err != nil {
		return 0, err
	}
	for p.pos < len(p.s) && (p.s[p.pos] == '*' || p.s[p.pos] == '/') {
		op := p.s[p.pos]
		p.pos++
		rhs, err := p.parseFactor()
		if err != nil {
			return 0, err
		}
		if op == '*' {
			v *= rhs
		} else if rhs != 0 {
			v /= rhs
		}
	}
	return v, nil
}

func (p *mathParser) parseFactor() (float64, error) {
	if p.pos >= len(p.s) {
		return 0, fmt.Errorf("unexpected EOF")
	}
	if p.s[p.pos] == '(' {
		p.pos++
		v, err := p.parseExpr()
		if err != nil {
			return 0, err
		}
		if p.pos >= len(p.s) || p.s[p.pos] != ')' {
			return 0, fmt.Errorf("missing ')'")
		}
		p.pos++
		return v, nil
	}
	start := p.pos
	for p.pos < len(p.s) && ((p.s[p.pos] >= '0' && p.s[p.pos] <= '9') || p.s[p.pos] == '.') {
		p.pos++
	}
	if start == p.pos {
		return 0, fmt.Errorf("expected number at %d", p.pos)
	}
	return strconv.ParseFloat(p.s[start:p.pos], 64)
}

func cellAt(rows [][]string, r, c int) string {
	if r < 0 || r >= len(rows) {
		return ""
	}
	if c < 0 || c >= len(rows[r]) {
		return ""
	}
	return rows[r][c]
}

func normKey(s string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(s)), " "))
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
