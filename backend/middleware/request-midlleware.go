package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)


func (m *Middleware) RequestMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestUri := ctx.Request.RequestURI
		if !strings.HasPrefix(requestUri, "/metrics"){
			 logrus.WithFields(logrus.Fields{
                "method": ctx.Request.Method,
                "status": ctx.Writer.Status(),
                "uri":    ctx.Request.RequestURI,
            }).Info("[REQUEST]")
		}
		ctx.Next()
	}
}
