package medical

import (
	"context"
	"testing"

	"github.com/rudyorre/autofit/internal/store"
)

func TestSHLinkA256GCMRoundTripAndLOINCParsing(t *testing.T) {
	ctx := context.Background()
	uri, err := GenerateSampleSHLink("2026-08-15")
	if err != nil {
		t.Fatalf("GenerateSampleSHLink failed: %v", err)
	}

	panels, err := ParseSHLink(ctx, store.DefaultUserID, uri, nil)
	if err != nil {
		t.Fatalf("ParseSHLink failed: %v", err)
	}
	if len(panels) != 1 {
		t.Fatalf("expected 1 panel from sample shlink, got %d", len(panels))
	}

	foundApoB := false
	foundHbA1c := false
	for _, obs := range panels[0].Observations {
		if obs.LOINCCode == "1884-6" && obs.BiomarkerSlug == "apob" && obs.ValueNum > 0 {
			foundApoB = true
		}
		if obs.LOINCCode == "4548-4" && obs.BiomarkerSlug == "hba1c" && obs.ValueNum > 0 {
			foundHbA1c = true
		}
	}
	if !foundApoB || !foundHbA1c {
		t.Fatalf("expected ApoB (1884-6) and HbA1c (4548-4) observations, got %+v", panels[0].Observations)
	}
}
