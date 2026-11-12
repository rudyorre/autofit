package importer

import (
	"bytes"
	"context"
	"testing"

	"github.com/xuri/excelize/v2"

	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

func TestParseLegacyCellFormulasAndNormalization(t *testing.T) {
	bench := store.Exercise{
		Slug:             "bench-press",
		Name:             "Bench Press",
		DefaultEquipment: "olympic_bar",
		DefaultTareLb:    45,
		LoadMode:         "plates_per_side",
	}
	dbRow := store.Exercise{
		Slug:             "dumbbell-row",
		Name:             "Dumbbell Row",
		DefaultEquipment: "dumbbell_pair",
		DefaultTareLb:    0,
		LoadMode:         "per_hand",
	}
	sled := store.Exercise{
		Slug:             "leg-press-sled",
		Name:             "Leg Press (Sled)",
		DefaultEquipment: "sled",
		DefaultTareLb:    125,
		LoadMode:         "plates_per_side",
	}

	// 1. Olympic barbell formula =45+2*45 -> 135 lb
	c1, ok, _ := ParseLegacyCell(bench, "135", "=45+2*45", 0, "C3")
	if !ok || c1.Equipment != "olympic_bar" || c1.TareLb != 45 || c1.PerSideOrHandLb != 45 || c1.TotalWeightLb != 135 {
		t.Fatalf("unexpected olympic bar parse: %+v (ok=%v)", c1, ok)
	}

	// 2. Smith machine formulas =20+47.5*2 and =15+2*(45+5)
	c2, ok, _ := ParseLegacyCell(bench, "115", "=20+(47.5)*2", 0, "D3")
	if !ok || c2.Equipment != "smith" || c2.TareLb != 20 || c2.PerSideOrHandLb != 47.5 || c2.TotalWeightLb != 115 {
		t.Fatalf("unexpected 20 lb smith parse: %+v", c2)
	}
	c3, ok, _ := ParseLegacyCell(bench, "115", "=15+2*(45+5)", 0, "E3")
	if !ok || c3.Equipment != "smith" || c3.TareLb != 15 || c3.PerSideOrHandLb != 50 || c3.TotalWeightLb != 115 {
		t.Fatalf("unexpected 15 lb smith parse: %+v", c3)
	}

	// 3. Sled formulas =118+2*80 and =125+2*90
	c4, ok, _ := ParseLegacyCell(sled, "278", "=118+2*80", 0, "Q26")
	if !ok || c4.Equipment != "sled" || c4.TareLb != 118 || c4.PerSideOrHandLb != 80 || c4.TotalWeightLb != 278 {
		t.Fatalf("unexpected 118 lb sled parse: %+v", c4)
	}
	c5, ok, _ := ParseLegacyCell(sled, "305", "=125+2*90", 0, "R26")
	if !ok || c5.Equipment != "sled" || c5.TareLb != 125 || c5.PerSideOrHandLb != 90 || c5.TotalWeightLb != 305 {
		t.Fatalf("unexpected 125 lb sled parse: %+v", c5)
	}

	// 4. Early 2022 single-DB plain entry (35) vs explicit =2*47.5 vs later already-doubled plain entry (80)
	c6, ok, _ := ParseLegacyCell(dbRow, "35", "", 40.0, "C41")
	if !ok || c6.Equipment != "dumbbell_pair" || c6.PerSideOrHandLb != 35 || c6.TotalWeightLb != 70 {
		t.Fatalf("expected early single-DB 35 -> 35/hand (70 total), got %+v", c6)
	}
	c7, ok, _ := ParseLegacyCell(dbRow, "95", "=2*47.5", 40.0, "Z41")
	if !ok || c7.Equipment != "dumbbell_pair" || c7.PerSideOrHandLb != 47.5 || c7.TotalWeightLb != 95 {
		t.Fatalf("expected =2*47.5 -> 47.5/hand (95 total), got %+v", c7)
	}
	c8, ok, _ := ParseLegacyCell(dbRow, "80", "", 40.0, "AA41")
	if !ok || c8.PerSideOrHandLb != 40 || c8.TotalWeightLb != 80 {
		t.Fatalf("expected already-doubled plain 80 -> 40/hand (80 total), got %+v", c8)
	}

	// 5. Real CB41 = 2235 fat-finger typo repair -> 35 lb/hand (70 lb total)
	c9, ok, note := ParseLegacyCell(dbRow, "2235", "", 40.0, "CB41")
	if !ok || !c9.TypoRepaired || c9.PerSideOrHandLb != 35 || c9.TotalWeightLb != 70 || note == "" {
		t.Fatalf("expected CB41=2235 typo repair to 70 lb total, got %+v (note=%q)", c9, note)
	}
}

func TestImportXLSXBytesDeduplicationAndDateHealing(t *testing.T) {
	ctx := context.Background()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer repo.Close()

	f := excelize.NewFile()
	sheet := f.GetSheetName(0)

	// Row 1 dates with real-world anomalies:
	// C1: 2023-12-13, D1: "12215/23" (heals to 2023-12-15), E1: blank (interpolates to 2023-12-16),
	// F1: "1/19224" (heals to 2024-01-19), G1: "12/28/24" (2024-12-28), H1: "1/04/24" (New-Year rollover -> 2025-01-04)
	_ = f.SetCellValue(sheet, "A1", "Exercise")
	_ = f.SetCellValue(sheet, "B1", "Scheme")
	_ = f.SetCellValue(sheet, "C1", "2023-12-13")
	_ = f.SetCellStr(sheet, "D1", "12215/23")
	_ = f.SetCellStr(sheet, "E1", "")
	_ = f.SetCellStr(sheet, "F1", "1/19224")
	_ = f.SetCellValue(sheet, "G1", "2024-12-28")
	_ = f.SetCellStr(sheet, "H1", "1/04/24")

	// Row 2: Bench Press (5x5)
	_ = f.SetCellValue(sheet, "A2", "Bench Press")
	_ = f.SetCellValue(sheet, "B2", "5x5")
	_ = f.SetCellFormula(sheet, "C2", "45+2*45")
	_ = f.SetCellFormula(sheet, "D2", "20+2*47.5")

	// Row 3 & Row 4: Duplicate cross-block rows ("Dumbell Row" and "Dumbbell Row") in same column E -> must deduplicate!
	_ = f.SetCellValue(sheet, "A3", "Dumbell Row")
	_ = f.SetCellValue(sheet, "B3", "4x10")
	_ = f.SetCellValue(sheet, "E3", 35)

	_ = f.SetCellValue(sheet, "A4", "Dumbbell Row")
	_ = f.SetCellValue(sheet, "B4", "4x10")
	_ = f.SetCellFormula(sheet, "E4", "2*40")
	_ = f.SetCellValue(sheet, "F4", 2235) // CB41 typo test in workbook
	_ = f.SetCellFormula(sheet, "G4", "2*42.5")
	_ = f.SetCellFormula(sheet, "H4", "2*45")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatalf("write xlsx: %v", err)
	}

	sum, err := ImportXLSXBytes(ctx, repo, store.DefaultUserID, buf.Bytes())
	if err != nil {
		t.Fatalf("ImportXLSXBytes failed: %v", err)
	}

	if sum.WorkoutsImported != 6 {
		t.Fatalf("expected 6 workouts imported, got %d", sum.WorkoutsImported)
	}
	if sum.DatesInterpolated != 1 {
		t.Fatalf("expected 1 interpolated blank date column, got %d", sum.DatesInterpolated)
	}
	if sum.DateRangeEnd != "2025-01-04" {
		t.Fatalf("expected New-Year rollover healed to 2025-01-04, got %s", sum.DateRangeEnd)
	}

	// Verify cross-block deduplication on 2023-12-16 (Column E): only 4 sets (higher =2*40 entry), not 8!
	sets, err := repo.ListAllWorkoutSetsWithDate(ctx, store.DefaultUserID)
	if err != nil {
		t.Fatalf("list sets: %v", err)
	}
	colESets := 0
	for _, st := range sets {
		if st.LocalDate == "2023-12-16" && st.ExerciseSlug == "dumbbell-row" {
			colESets++
			if st.PerSideOrHandLb != 40 || st.TotalWeightLb != 80 {
				t.Fatalf("expected deduplicated higher load 40/hand (80 total), got %+v", st)
			}
		}
	}
	if colESets != 4 {
		t.Fatalf("expected 4 deduplicated sets on 2023-12-16, got %d", colESets)
	}
}
