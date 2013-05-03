require 'rubygems'
require 'sinatra/base'
require 'rest_client'
require 'base64'
require 'json'

if !File.exists?("config.json")
	puts "Missing config.json. See config.json.example."
	exit 1
end

class EndpointMixApi < Sinatra::Base
	configure do
		set :bind, '0.0.0.0'
		set :indigoSessionId, ''
		set :static_cache_control, [ :public, :max_age => 3600 ]
	end

	get '/' do
		headers 'Cache-Control' => 'no-cache'
		send_file 'public/index.html'
	end

	get '/styles/all.css' do
		less :'../public/styles/all'
	end

	get '/api/endpointmix' do
		getEndpointMix()
	end

	def renewSessionCookie
		configSource = File.read("config.json")#read config.json from disk into string
		config = JSON.parse(configSource)
		username = config['username']
		password = config['password']
		response = RestClient.post('http://10.100.0.19:8080/indigo-webapp/j_spring_security_check', { :j_username => username, :j_password => password })
		settings.indigoSessionId = response.cookies['JSESSIONID']
	end

	def getEndpointMix
		response = RestClient.get('http://10.100.0.19:8080/indigo-webapp/indigo/meetings/live-meeting-summary.json?gf=%7B%22entityFilter%22%3A%22NONE%22%2C%22meetingFilter%22%3A3%2C%22entity%22%3Anull%2C%22entityDisplayName%22%3A%22%22%2C%22billableFilter%22%3Afalse%7D', { :cookies => { :JSESSIONID => settings.indigoSessionId }})

		handleResponse(response) { getEndpointMix() }
	end

	def handleResponse(resp)
		if resp.to_str.include? "<title>Login</title>"
			renewSessionCookie()
			yield
		else
			[200, { 'Content-Type' => 'application/json', 'Cache-Control' => 'no-cache' }, resp.to_str]
		end
	end

end