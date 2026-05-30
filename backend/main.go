package main

import (
	"io"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"github.com/sirupsen/logrus/hooks/writer"
)


func init(){
	logrus.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339Nano,
		PrettyPrint: true,
	})
	logrus.SetLevel(logrus.DebugLevel)

	logrus.StandardLogger().Hooks = make(logrus.LevelHooks)
	logrus.SetOutput(io.Discard)
	logrus.AddHook(&writer.Hook{
		Writer: os.Stderr,
		LogLevels: []logrus.Level{
			logrus.PanicLevel,
			logrus.FatalLevel,
			logrus.ErrorLevel,
			logrus.WarnLevel,
		},
	})

	logrus.AddHook(&writer.Hook{
		Writer: os.Stdout,
		LogLevels: []logrus.Level{
			logrus.InfoLevel,
			logrus.DebugLevel,
		},
	})

	if stage,exists:=os.LookupEnv("APP_STAGE");!exists||stage=="dev"{
		logrus.Info("Starting in development mode")
		if err:=godotenv.Load();err!=nil{
			logrus.Fatalf("Error loading .env file: %v",err)
		}
	}else{
		logrus.Info("Starting in production mode")
	}

}


func main(){
	err:=NewApp().SetupMiddleware().SetupRoutes().Listen()
	if err!=nil{
		logrus.Fatalf("Error starting server: %v",err)
	}
}