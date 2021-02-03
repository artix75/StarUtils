#!/usr/bin/env ruby

require 'rubygems'
require 'bundler/setup'

require 'sinatra'

$app_path = File.expand_path(File.dirname(__FILE__))
$localconf = File.join $app_path, 'localconfig.rb'

load $localconf if File.exists?($localconf)

$port ||= 4580
set :port, $port

get '/' do
    "<h1>PixInsight Repository Sandbox</h1>"
end

