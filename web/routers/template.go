package routers

import (
	"embed"
	"html/template"
	"net/http"
)

var templates *template.Template

func InitTemplates(fs embed.FS) error {
	var err error
	
	templates = &template.Template{}

	templates, err = template.New("").Funcs(GetFuncMap()).ParseFS(fs, "out/*.html")
	if err != nil {
		return err
	}

	return nil
}

func RenderTemplate(w http.ResponseWriter, name string, data any) error {
	return templates.ExecuteTemplate(w, name, data)
}

// TemplateHandler returns an http.HandlerFunc that renders a template with the provided name and data function.
// dataFunc is a function that takes an *http.Request and returns the data to be passed to the template.
func TemplateHandler(name string, dataFunc func(*http.Request) any) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var data any
		if dataFunc != nil {
			data = dataFunc(r)
		}

		if err := RenderTemplate(w, name, data); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func GetFuncMap() template.FuncMap {
	return template.FuncMap{
		"loop": func(from, to int) <-chan int {
			ch := make(chan int)
			go func() {
				for i := from; i <= to; i++ {
					ch <- i
				}
				close(ch)
			}()
			return ch
		},
	}
}