package handlers

import (
	"github.com/ThanvirXo/jd-analyzer/common"
	"github.com/ThanvirXo/jd-analyzer/requests"
	"github.com/gin-gonic/gin"
)

func (h *Handler) Analyze(c *gin.Context) {

	body,err:=requests.DecodeBody[requests.AnalyzeRequest](c.Request.Body)
	if err!=nil{
		common.NewResponse(common.ERROR, err.Error()).Respond(c)
		return
	}

	status, data, err := h.Services.Analyze(c, body)
	if err != nil {
		common.NewResponse(common.ERROR, err.Error()).Respond(c)
		return
	}

	common.NewResponse(status, "Analyzed successfully").SetData(data).Respond(c)
}

func (h *Handler) HealthCheck(c *gin.Context) {
	status, err := h.Services.HealthCheck(c)
	if err != nil {
		common.NewResponse(common.ERROR, err.Error()).Respond(c)
		return
	}
	common.NewResponse(status, "Health check successful").Respond(c)
}