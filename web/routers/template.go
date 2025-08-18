package routers

import (
	"embed"
	"fmt"
	"html/template"
	"net/http"
)

var templates map[string]*template.Template

func InitTemplates(fs embed.FS) error {
	templates = make(map[string]*template.Template)

	tmpl, err := template.ParseFS(fs, "out/index.html", "out/*.html")
	if err != nil {
		return err
	}

	templates["default"] = tmpl
	return nil
}

func RenderTemplate(w http.ResponseWriter, name string, data any) error {
	tmpl, ok := templates[name]
	if !ok {
		return fmt.Errorf("template not found: %s", name)
	}

	return tmpl.Execute(w, data)
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