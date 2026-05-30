package middleware

import (
	"crypto/subtle"
	"os"
	"strings"

	"github.com/ThanvirXo/jd-analyzer/common"
	"github.com/gin-gonic/gin"
)

func (m *Middleware) AuthMiddleware() gin.HandlerFunc {
	expected := os.Getenv("API_KEY")

	return func(c *gin.Context) {
		if expected == "" {
			c.Next()
			return
		}

		provided := strings.TrimSpace(
			strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "),
		)

		if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
			common.NewResponse(common.UNAUTHORIZED, "Invalid or missing API key").Respond(c)
			c.Abort()
			return
		}

		c.Next()
	}
}
