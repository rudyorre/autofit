package medical

import (
	"bytes"
	"compress/flate"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

type BiomarkerMeta struct {
	Slug        string
	Name        string
	LOINC       string
	Unit        string
	RefLow      float64
	RefHigh     float64
	OptimalLow  float64
	OptimalHigh float64
}

var loincDirectory = map[string]BiomarkerMeta{
	"1884-6":  {Slug: "apob", Name: "ApoB", LOINC: "1884-6", Unit: "mg/dL", RefLow: 40, RefHigh: 100, OptimalLow: 40, OptimalHigh: 80},
	"4548-4":  {Slug: "hba1c", Name: "HbA1c", LOINC: "4548-4", Unit: "%", RefLow: 4.0, RefHigh: 5.6, OptimalLow: 4.5, OptimalHigh: 5.3},
	"30522-7": {Slug: "hs-crp", Name: "hs-CRP", LOINC: "30522-7", Unit: "mg/L", RefLow: 0.0, RefHigh: 3.0, OptimalLow: 0.0, OptimalHigh: 1.0},
	"13457-7": {Slug: "ldl-c", Name: "LDL-C", LOINC: "13457-7", Unit: "mg/dL", RefLow: 0, RefHigh: 99, OptimalLow: 30, OptimalHigh: 80},
	"2089-1":  {Slug: "ldl-c", Name: "LDL-C", LOINC: "2089-1", Unit: "mg/dL", RefLow: 0, RefHigh: 99, OptimalLow: 30, OptimalHigh: 80},
	"2276-4":  {Slug: "ferritin", Name: "Ferritin", LOINC: "2276-4", Unit: "ng/mL", RefLow: 30, RefHigh: 400, OptimalLow: 60, OptimalHigh: 180},
	"1989-3":  {Slug: "vitamin-d", Name: "Vitamin D (25-OH)", LOINC: "1989-3", Unit: "ng/mL", RefLow: 30, RefHigh: 100, OptimalLow: 40, OptimalHigh: 70},
	"62292-8": {Slug: "vitamin-d", Name: "Vitamin D (25-OH)", LOINC: "62292-8", Unit: "ng/mL", RefLow: 30, RefHigh: 100, OptimalLow: 40, OptimalHigh: 70},
	"2085-9":  {Slug: "hdl-c", Name: "HDL-C", LOINC: "2085-9", Unit: "mg/dL", RefLow: 40, RefHigh: 100, OptimalLow: 55, OptimalHigh: 95},
	"2571-8":  {Slug: "triglycerides", Name: "Triglycerides", LOINC: "2571-8", Unit: "mg/dL", RefLow: 0, RefHigh: 149, OptimalLow: 35, OptimalHigh: 90},
	"2345-7":  {Slug: "glucose", Name: "Fasting Glucose", LOINC: "2345-7", Unit: "mg/dL", RefLow: 65, RefHigh: 99, OptimalLow: 72, OptimalHigh: 90},
}

type SHLinkDescriptor struct {
	URL   string   `json:"url,omitempty"`
	Key   string   `json:"key"`
	Label string   `json:"label,omitempty"`
	Flag  string   `json:"flag,omitempty"`
	Files []string `json:"files,omitempty"` // Optional inline JWE files for offline/self-contained links
}

type jweHeader struct {
	Alg string `json:"alg"`
	Enc string `json:"enc"`
	Zip string `json:"zip,omitempty"`
}

// ParseSHLink decodes an HL7 SMART Health Link (`shlink:/...`), decrypts its JWE (`alg: dir`, `enc: A256GCM`, optional `zip: DEF`) payload(s), and extracts FHIR R4 LabPanels.
func ParseSHLink(ctx context.Context, userID, shlinkURI string, httpClient *http.Client) ([]store.LabPanel, error) {
	trimmed := strings.TrimSpace(shlinkURI)
	idx := strings.Index(trimmed, "shlink:/")
	if idx < 0 {
		return nil, fmt.Errorf("invalid SMART Health Link: missing shlink:/ prefix")
	}
	b64Payload := trimmed[idx+len("shlink:/"):]
	descBytes, err := base64.RawURLEncoding.DecodeString(b64Payload)
	if err != nil {
		return nil, fmt.Errorf("decode shlink base64url descriptor: %w", err)
	}

	var desc SHLinkDescriptor
	if err := json.Unmarshal(descBytes, &desc); err != nil {
		return nil, fmt.Errorf("parse shlink json descriptor: %w", err)
	}
	keyBytes, err := base64.RawURLEncoding.DecodeString(desc.Key)
	if err != nil || len(keyBytes) != 32 {
		return nil, fmt.Errorf("shlink key must be 32-byte base64url A256GCM key")
	}

	var jwePayloads []string
	jwePayloads = append(jwePayloads, desc.Files...)

	// If no inline files, fetch standard HL7 SHLink manifest POST -> files
	if len(jwePayloads) == 0 && desc.URL != "" {
		if httpClient == nil {
			httpClient = &http.Client{Timeout: 15 * time.Second}
		}
		reqBody, _ := json.Marshal(map[string]string{"recipient": "Autofit Homelab"})
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, desc.URL, bytes.NewReader(reqBody))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("fetch shlink manifest: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("shlink manifest status %d", resp.StatusCode)
		}
		var manifest struct {
			Files []struct {
				ContentType string `json:"contentType"`
				Embedded    string `json:"embedded"`
				Location    string `json:"location"`
			} `json:"files"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
			return nil, err
		}
		for _, f := range manifest.Files {
			if f.Embedded != "" {
				jwePayloads = append(jwePayloads, f.Embedded)
			} else if f.Location != "" {
				fResp, err := httpClient.Get(f.Location)
				if err == nil && fResp.StatusCode == http.StatusOK {
					b, _ := io.ReadAll(io.LimitReader(fResp.Body, 10<<20))
					jwePayloads = append(jwePayloads, strings.TrimSpace(string(b)))
				}
				if fResp != nil {
					_ = fResp.Body.Close()
				}
			}
		}
	}

	if len(jwePayloads) == 0 {
		return nil, fmt.Errorf("shlink contained no JWE clinical payloads")
	}

	var allPanels []store.LabPanel
	for _, compactJWE := range jwePayloads {
		plain, err := DecryptCompactJWE(compactJWE, keyBytes)
		if err != nil {
			return nil, err
		}
		panels, err := ParseFHIRBundleJSON(userID, "shlink", desc.Label, plain)
		if err != nil {
			return nil, err
		}
		allPanels = append(allPanels, panels...)
	}
	return allPanels, nil
}

// DecryptCompactJWE decrypts a compact 5-part JWE (`alg: "dir"`, `enc: "A256GCM"`, optional `zip: "DEF"`).
func DecryptCompactJWE(compact string, key []byte) ([]byte, error) {
	parts := strings.Split(strings.TrimSpace(compact), ".")
	if len(parts) != 5 {
		return nil, fmt.Errorf("invalid compact JWE: expected 5 parts, got %d", len(parts))
	}
	hdrJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("decode JWE header: %w", err)
	}
	var hdr jweHeader
	if err := json.Unmarshal(hdrJSON, &hdr); err != nil {
		return nil, err
	}
	if hdr.Alg != "dir" || hdr.Enc != "A256GCM" {
		return nil, fmt.Errorf("unsupported JWE alg/enc: %s / %s (expected dir / A256GCM)", hdr.Alg, hdr.Enc)
	}

	iv, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("decode JWE IV: %w", err)
	}
	ciphertext, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return nil, fmt.Errorf("decode JWE ciphertext: %w", err)
	}
	tag, err := base64.RawURLEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, fmt.Errorf("decode JWE auth tag: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCMWithNonceSize(block, len(iv))
	if err != nil {
		return nil, err
	}

	sealed := append(ciphertext, tag...)
	aad := []byte(parts[0])
	plain, err := gcm.Open(nil, iv, sealed, aad)
	if err != nil {
		return nil, fmt.Errorf("decrypt JWE A256GCM failed: %w", err)
	}

	if strings.EqualFold(hdr.Zip, "DEF") {
		fr := flate.NewReader(bytes.NewReader(plain))
		defer fr.Close()
		inflated, err := io.ReadAll(io.LimitReader(fr, 20<<20))
		if err != nil {
			return nil, fmt.Errorf("inflate DEF JWE payload: %w", err)
		}
		plain = inflated
	}
	return plain, nil
}

// EncryptCompactJWE encrypts plaintext into a standard HL7 SMART Health Link compact JWE (`dir` + `A256GCM` + `DEF`).
func EncryptCompactJWE(plaintext, key []byte) (string, error) {
	if len(key) != 32 {
		return "", fmt.Errorf("A256GCM key must be 32 bytes")
	}
	var defBuf bytes.Buffer
	fw, err := flate.NewWriter(&defBuf, flate.DefaultCompression)
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(plaintext); err != nil {
		return "", err
	}
	if err := fw.Close(); err != nil {
		return "", err
	}

	hdrBytes, _ := json.Marshal(jweHeader{Alg: "dir", Enc: "A256GCM", Zip: "DEF"})
	protectedB64 := base64.RawURLEncoding.EncodeToString(hdrBytes)

	iv := make([]byte, 12)
	if _, err := rand.Read(iv); err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	sealed := gcm.Seal(nil, iv, defBuf.Bytes(), []byte(protectedB64))
	tagOffset := len(sealed) - gcm.Overhead()
	ct := sealed[:tagOffset]
	tag := sealed[tagOffset:]

	return strings.Join([]string{
		protectedB64,
		"", // empty encrypted key for alg=dir
		base64.RawURLEncoding.EncodeToString(iv),
		base64.RawURLEncoding.EncodeToString(ct),
		base64.RawURLEncoding.EncodeToString(tag),
	}, "."), nil
}

// GenerateSampleSHLink builds a real, cryptographically encrypted (`A256GCM` + `DEF`) `shlink:/...` URI containing a multi-biomarker FHIR R4 Observation Bundle.
func GenerateSampleSHLink(collectedDate string) (string, error) {
	if collectedDate == "" {
		collectedDate = time.Now().UTC().Format("2006-01-02")
	}
	fhirBundle := map[string]any{
		"resourceType": "Bundle",
		"type":         "collection",
		"entry": []map[string]any{
			makeFHIRObs("1884-6", "Apolipoprotein B", 72, "mg/dL", collectedDate, 40, 100),
			makeFHIRObs("4548-4", "Hemoglobin A1c", 5.0, "%", collectedDate, 4.0, 5.6),
			makeFHIRObs("30522-7", "High Sensitivity CRP", 0.35, "mg/L", collectedDate, 0.0, 3.0),
			makeFHIRObs("13457-7", "LDL Cholesterol", 65, "mg/dL", collectedDate, 0, 99),
			makeFHIRObs("2276-4", "Ferritin", 96, "ng/mL", collectedDate, 30, 400),
			makeFHIRObs("1989-3", "25-Hydroxyvitamin D", 51, "ng/mL", collectedDate, 30, 100),
		},
	}
	plainJSON, err := json.Marshal(fhirBundle)
	if err != nil {
		return "", err
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return "", err
	}
	jwe, err := EncryptCompactJWE(plainJSON, key)
	if err != nil {
		return "", err
	}
	desc := SHLinkDescriptor{
		Key:   base64.RawURLEncoding.EncodeToString(key),
		Label: "Google Health Shareable Lab Record",
		Flag:  "L",
		Files: []string{jwe},
	}
	descJSON, _ := json.Marshal(desc)
	return "shlink:/" + base64.RawURLEncoding.EncodeToString(descJSON), nil
}

func makeFHIRObs(loinc, display string, val float64, unit, dateStr string, low, high float64) map[string]any {
	return map[string]any{
		"resource": map[string]any{
			"resourceType":      "Observation",
			"status":            "final",
			"effectiveDateTime": dateStr + "T08:30:00Z",
			"code": map[string]any{
				"coding": []map[string]any{
					{"system": "http://loinc.org", "code": loinc, "display": display},
				},
			},
			"valueQuantity": map[string]any{
				"value": val,
				"unit":  unit,
			},
			"referenceRange": []map[string]any{
				{
					"low":  map[string]any{"value": low, "unit": unit},
					"high": map[string]any{"value": high, "unit": unit},
				},
			},
		},
	}
}

// ParseFHIRBundleJSON deterministically parses FHIR R4 Bundle (or single Observation) JSON into LOINC-standardized LabPanels.
func ParseFHIRBundleJSON(userID, source, provider string, raw []byte) ([]store.LabPanel, error) {
	if userID == "" {
		userID = store.DefaultUserID
	}
	if provider == "" {
		provider = "FHIR Clinical Record"
	}

	// Support newline-delimited FHIR JSON (SHC / SHL `.fhir` lines) or standard JSON object
	var resources []json.RawMessage
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return nil, fmt.Errorf("empty FHIR payload")
	}

	var top struct {
		ResourceType string `json:"resourceType"`
		Entry        []struct {
			Resource json.RawMessage `json:"resource"`
		} `json:"entry"`
	}
	if err := json.Unmarshal(trimmed, &top); err == nil && top.ResourceType != "" {
		if top.ResourceType == "Bundle" {
			for _, e := range top.Entry {
				if len(e.Resource) > 0 {
					resources = append(resources, e.Resource)
				}
			}
		} else if top.ResourceType == "Observation" {
			resources = append(resources, trimmed)
		}
	} else {
		for _, line := range bytes.Split(trimmed, []byte("\n")) {
			line = bytes.TrimSpace(line)
			if len(line) > 0 {
				resources = append(resources, line)
			}
		}
	}

	byDate := make(map[string]*store.LabPanel)
	var dateOrder []string

	for _, resBytes := range resources {
		var obs struct {
			ResourceType      string `json:"resourceType"`
			EffectiveDateTime string `json:"effectiveDateTime"`
			Issued            string `json:"issued"`
			Code              struct {
				Text   string `json:"text"`
				Coding []struct {
					System  string `json:"system"`
					Code    string `json:"code"`
					Display string `json:"display"`
				} `json:"coding"`
			} `json:"code"`
			ValueQuantity *struct {
				Value float64 `json:"value"`
				Unit  string  `json:"unit"`
			} `json:"valueQuantity"`
			ReferenceRange []struct {
				Low  *struct{ Value float64 } `json:"low"`
				High *struct{ Value float64 } `json:"high"`
			} `json:"referenceRange"`
		}
		if err := json.Unmarshal(resBytes, &obs); err != nil || obs.ResourceType != "Observation" || obs.ValueQuantity == nil {
			continue
		}

		var loincCode, display string
		for _, c := range obs.Code.Coding {
			if strings.Contains(strings.ToLower(c.System), "loinc") || loincCode == "" {
				loincCode = c.Code
				display = c.Display
			}
		}
		if display == "" {
			display = obs.Code.Text
		}
		meta, known := LookupBiomarker(loincCode, display)
		if !known {
			slug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(display), " ", "-"))
			if slug == "" {
				slug = "loinc-" + loincCode
			}
			meta = BiomarkerMeta{
				Slug:  slug,
				Name:  display,
				LOINC: loincCode,
				Unit:  obs.ValueQuantity.Unit,
			}
		}

		collectedAt := parseFHIRTime(obs.EffectiveDateTime, obs.Issued)
		localDate := collectedAt.Format("2006-01-02")

		refLow, refHigh := meta.RefLow, meta.RefHigh
		if len(obs.ReferenceRange) > 0 {
			if obs.ReferenceRange[0].Low != nil {
				refLow = obs.ReferenceRange[0].Low.Value
			}
			if obs.ReferenceRange[0].High != nil {
				refHigh = obs.ReferenceRange[0].High.Value
			}
		}
		unit := obs.ValueQuantity.Unit
		if unit == "" {
			unit = meta.Unit
		}

		panel, ok := byDate[localDate]
		if !ok {
			panel = &store.LabPanel{
				ID:          fmt.Sprintf("panel-%s-%s", source, localDate),
				UserID:      userID,
				CollectedAt: collectedAt,
				LocalDate:   localDate,
				Source:      source,
				Provider:    provider,
			}
			byDate[localDate] = panel
			dateOrder = append(dateOrder, localDate)
		}

		panel.Observations = append(panel.Observations, store.LabObservation{
			ID:            sqlite.NewID(),
			UserID:        userID,
			PanelID:       panel.ID,
			CollectedAt:   collectedAt,
			LocalDate:     localDate,
			LOINCCode:     meta.LOINC,
			BiomarkerSlug: meta.Slug,
			BiomarkerName: meta.Name,
			ValueNum:      obs.ValueQuantity.Value,
			Unit:          unit,
			RefLow:        refLow,
			RefHigh:       refHigh,
			OptimalLow:    meta.OptimalLow,
			OptimalHigh:   meta.OptimalHigh,
			FHIRRawJSON:   string(resBytes),
		})
	}

	var out []store.LabPanel
	for _, d := range dateOrder {
		out = append(out, *byDate[d])
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no quantitative FHIR R4 Observation resources found")
	}
	return out, nil
}

func LookupBiomarker(loinc, name string) (BiomarkerMeta, bool) {
	if m, ok := loincDirectory[strings.TrimSpace(loinc)]; ok {
		return m, true
	}
	nl := strings.ToLower(strings.TrimSpace(name))
	for _, m := range loincDirectory {
		if strings.ToLower(m.Name) == nl || m.Slug == nl {
			return m, true
		}
	}
	return BiomarkerMeta{}, false
}

func parseFHIRTime(candidates ...string) time.Time {
	layouts := []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02"}
	for _, s := range candidates {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		for _, l := range layouts {
			if dt, err := time.Parse(l, s); err == nil {
				return dt.UTC()
			}
		}
	}
	return time.Now().UTC()
}
