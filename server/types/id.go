package types

import "crypto/rand"

// idAlphabet is a URL-safe base62 alphabet. idLength keeps IDs short while staying
// collision-resistant: 62^12 ≈ 3.2e21 possibilities.
const (
	idAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	idLength   = 12
)

// NewID returns a short, random, URL-safe identifier using crypto/rand with no external
// dependency. IDs are opaque, so the alphabet/length are not part of the persisted format.
func NewID() string {
	// Largest multiple of the alphabet size that fits in a byte (62*4 = 248). Rejecting bytes
	// >= limit removes the modulo bias so every character is equally likely.
	const limit = 256 - (256 % len(idAlphabet))
	id := make([]byte, 0, idLength)
	buf := make([]byte, idLength)
	for len(id) < idLength {
		if _, err := rand.Read(buf); err != nil {
			// crypto/rand.Read does not fail on supported platforms; not returning an error
			// keeps NewID callable from initializers.
			panic(err)
		}
		for _, b := range buf {
			if int(b) >= limit {
				continue
			}
			id = append(id, idAlphabet[int(b)%len(idAlphabet)])
			if len(id) == idLength {
				break
			}
		}
	}
	return string(id)
}
