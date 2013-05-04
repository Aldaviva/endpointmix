all: run

dev:
	@RACK_ENV=development rackup
	

run:
	@RACK_ENV=production rackup