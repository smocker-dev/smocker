package types

import "time"

type GraphConfig struct {
	SrcHeader  string `query:"src"`
	DestHeader string `query:"dest"`
}

type GraphEntry struct {
	Type    string    `json:"type"`
	Message string    `json:"message"`
	From    string    `json:"from"`
	To      string    `json:"to"`
	Date    time.Time `json:"date"`
}

type GraphHistory []GraphEntry

func (p GraphHistory) Len() int {
	return len(p)
}

func (p GraphHistory) Less(i, j int) bool {
	return p[i].Date.Before(p[j].Date)
}

func (p GraphHistory) Swap(i, j int) {
	p[i], p[j] = p[j], p[i]
}
