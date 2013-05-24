JSL := jsl
LESSC := node_modules/less/bin/lessc
NODE := node
NPM := npm

all: lint css

.PHONY: lint
lint:
	@$(JSL) --conf=tools/jsl.conf --nofilelisting --nologo --nosummary *.js

css:
	@$(LESSC) public/styles/all.less public/styles/all.css

run: 
	@$(NODE) .

deps:
	@$(NPM) install