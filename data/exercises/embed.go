package exercises

import (
	_ "embed"
	"encoding/json"
)

//go:embed catalog.json
var rawCatalog []byte

type CatalogExercise struct {
	Slug             string   `json:"slug"`
	Name             string   `json:"name"`
	PrimaryMuscle    string   `json:"primary_muscle"`
	SecondaryMuscles []string `json:"secondary_muscles"`
	DefaultEquipment string   `json:"default_equipment"`
	DefaultTareLb    float64  `json:"default_tare_lb"`
	LoadMode         string   `json:"load_mode"`
	DefaultSets      int      `json:"default_sets"`
	DefaultReps      int      `json:"default_reps"`
	LegacyAliases    []string `json:"legacy_aliases"`
}

type CatalogSplitItem struct {
	ExerciseSlug string `json:"exercise_slug"`
	TargetSets   int    `json:"target_sets"`
	TargetReps   int    `json:"target_reps"`
}

type CatalogSplit struct {
	ID       string             `json:"id"`
	Slug     string             `json:"slug"`
	Title    string             `json:"title"`
	Focus    string             `json:"focus"`
	RowStart int                `json:"row_start"`
	RowEnd   int                `json:"row_end"`
	Items    []CatalogSplitItem `json:"items"`
}

type Catalog struct {
	Exercises []CatalogExercise `json:"exercises"`
	Splits    []CatalogSplit    `json:"splits"`
}

func LoadEmbedded() (*Catalog, error) {
	var c Catalog
	if err := json.Unmarshal(rawCatalog, &c); err != nil {
		return nil, err
	}
	return &c, nil
}
