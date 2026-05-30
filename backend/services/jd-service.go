package services

import (
	"github.com/ThanvirXo/jd-analyzer/agent"
	"github.com/ThanvirXo/jd-analyzer/common"
	"github.com/ThanvirXo/jd-analyzer/requests"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func (s *Service) Analyze(c *gin.Context,body requests.AnalyzeRequest) (status common.ResponseType,data *agent.AnalyzeResult, err error) {

	if err := body.Validate(); err != nil {
		return common.ERROR, nil, err
	}
	logrus.Info("Resume: ", body.Resume)
	logrus.Info("JD: ", body.JD)
	analyzeResult, err := s.Agent.Analyze(c.Request.Context(), body.Resume, body.JD)
	if err != nil {
		return common.ERROR, nil, err
	}

	return common.SUCCESS, analyzeResult, nil
}
