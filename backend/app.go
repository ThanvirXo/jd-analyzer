package main

import (
	"os"

	"github.com/ThanvirXo/jd-analyzer/agent"
	"github.com/ThanvirXo/jd-analyzer/handlers"
	"github.com/ThanvirXo/jd-analyzer/middleware"
	"github.com/ThanvirXo/jd-analyzer/services"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)


type App struct {
	Middlewares *middleware.Middleware
	Router      *gin.Engine
	Handler     *handlers.Handler
}

func NewApp() *App{
	r:=gin.New()

	middleware:=middleware.Middleware{}

	ag,err:=agent.New()
	if err!=nil{
		logrus.Fatalf("failed to initialize agent: %v",err)
	}

	service:=services.Service{
		Agent: ag,
	}

	handler:=handlers.Handler{
		Services: &service,
	}
	return &App{
		Router: r,
		Handler: &handler,
		Middlewares: &middleware,
	}
}


func (a *App) SetupMiddleware() *App{
	a.Router.Use(a.Middlewares.CORSMiddleware())
	a.Router.Use(a.Middlewares.AuthMiddleware())
	a.Router.Use(a.Middlewares.RequestMiddleware())
	a.Router.Use(gin.Recovery())
	a.Router.Use(gin.Logger())
	return a
}

func (a *App) Listen() error {
	port:=os.Getenv("PORT")
	if port==""{
		port="8220"
	}
	logrus.Infof("Starting server on port %s", port)
	return a.Router.Run(":" + port)
}

func (a *App) SetupRoutes() *App{
	router:=a.Router

	handler:=a.Handler
	jdMatchAnalyzer:=router.Group("/api")
	jdMatchAnalyzer.POST("/analyze", handler.Analyze)
	return a
}