package garmin

import (
	"testing"
	"time"

	"github.com/rudyorre/autofit/internal/store"
)

func TestBuildAndDecodeFITBinaryRoundTrip(t *testing.T) {
	start := time.Date(2026, 9, 4, 14, 0, 0, 0, time.UTC)
	raw, err := BuildSampleRunFIT(start, []float64{468, 442, 425, 420}, []int{139, 151, 161, 166})
	if err != nil {
		t.Fatalf("BuildSampleRunFIT failed: %v", err)
	}
	if len(raw) < 100 {
		t.Fatalf("expected non-trivial FIT binary payload, got %d bytes", len(raw))
	}

	act, err := DecodeFITBytes(store.DefaultUserID, "Tempo 4-Miler", raw)
	if err != nil {
		t.Fatalf("DecodeFITBytes failed: %v", err)
	}
	if len(act.Splits) != 4 {
		t.Fatalf("expected 4 decoded mile splits, got %d", len(act.Splits))
	}
	if act.AvgCadence < 175 || act.AvgCadence > 190 {
		t.Fatalf("expected normalized running cadence ~182 spm, got %d", act.AvgCadence)
	}
	if act.VDOTOpen <= 35 || act.TRIMP <= 20 || act.Zone2PaceSecPerMi <= 300 {
		t.Fatalf("expected computed VDOT, TRIMP, and Zone2Pace, got VDOT=%.1f TRIMP=%.1f Z2Pace=%.1f",
			act.VDOTOpen, act.TRIMP, act.Zone2PaceSecPerMi)
	}
}
