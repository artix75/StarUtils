#!/usr/bin/env ruby

require 'rubygems'
require 'time'
require 'fileutils'
require 'digest'
require 'cgi'
require 'optparse'
begin
    require 'nokogiri'
rescue Exception => e
    STDERR.puts "Missing Nokogiri gem, please install it with:"
    STDERR.puts "gem install nokogiri"
    exit 1
end

$script_path = File.expand_path(File.dirname(__FILE__))
$script_name = File.basename($script_path)

EXCLUDE_SOURCES = {
    'StarUtils_Test.js' => true,
}

MAIN_SRC = 'StarUtils-main.js'
VERSION_SRC = 'StarUtils-version.jsh'
VERSION_EXP = /\d+\.\d+\.\d+(?:\-\w+)/

def color_str(str, color = nil, bold: false, dim: false)
    str = str.to_s if !str.is_a? String
    if !$color_codes
        $color_codes = {}
        %w(red green yellow blue magenta cyan white).each_with_index{|col,i|
            $color_codes[:"#{col}"] = 31 + i
        }
    end
    code = ''
    if color
        color_code = $color_codes[:"#{color.to_s}"]
        if !color_code
            raise "Invalid color code #{color}"
        end
        code << color_code.to_s
    end
    code << ';1' if bold
    code << ';2' if dim
    code << ';' if code.empty?
    "\e[#{code}m#{str}\e[0m"
end

def log_error(err)
    STDERR.puts(color_str(err, :red))
end

def log_info(str)
    puts color_str(str, :cyan)
end

def log_success(str)
    puts color_str(str, :green)
end

def urand2hex(len)
    ur=File.read('/dev/urandom',len)
    s=''
    ur.each_byte{|b|
        s<<("%02x" % b)
    }
    s
end

def host_system
    name = `uname -s`
    name.gsub! /\n$/,''
    {
        'Linux' => :linux,
        'Darwin' => :mac
    }[name]
end

def find_pixinsight_executable
    sys = host_system
    path = nil
    if sys == :mac || !sys
        rootpath = '/Applications/PixInsight/'
        if File.exists? rootpath
            rootpath =
                `find #{rootpath.inspect} -type d -iname PixInsight.app`.strip
            if !rootpath.empty?
                path =
                    `find #{rootpath.inspect} -type f -iname PixInsight`.strip
                path = nil if path.empty?
                path = nil if path && !File.executable_real?(path)
            end
        end
    end
    if !path && (sys == :linux || !sys)
        path = `which PixInsight`.strip
        if path.empty?
            rootpath = '/opt/PixInsight'
            if !rootpath.empty?
                path =
                    `find #{rootpath.inspect} -type f -iname PixInsight`.strip
                path = nil if path.empty?
                path = nil if path && !File.executable_real?(path)
            end
        end
    end
    path
end

def get_pixinsight_version
    pixinsight = find_pixinsight_executable
    return nil if !pixinsight
    cmd = "#{pixinsight.inspect} --help 2>&1"
    out = `#{cmd}`.strip
    if (match =  out.match(/PixInsight\s+Core\s+(\d+\.\d+\.8(?:-\d+))/))
        return match[1]
    end
end

def pixinsight_version_range(curversion)
    major, minor, rev, build = curversion.split(/[\.\-]/)
    if !major || !minor || !rev
        return nil
    end
    from = [major, minor, rev]
    to = [major, minor, rev]
    to << build if build
    "#{from.join('.')}:#{to.join('.')}"
end

def load_release_notes
    $relase_path ||= File.join($script_path, 'RELEASE')
    content = File.read $relase_path
    releases = []
    release = nil
    release_header = nil
    content.split(/\n+/).each{|l|
        l.strip!
        if l[/^==+/]
            if !release_header
                release_header = ''
                releases << release if release
                release = nil
                next
            else
                version  = release_header.match(VERSION_EXP)
                version = version[0] if version
                release = {
                    header: release_header,
                    version: version,
                }
                release_header = nil
            end
        end
        if release_header
            release_header << l
            next
        end
        if release && (match = l.match(/^\*\s+(.+)/))
            release[:changes] ||= []
            release[:changes] << match[1]
        end
    }
    releases << release if release
    releases
end

def get_description
    mainsrc = File.join $script_path, MAIN_SRC
    content = File.read mainsrc
    descr = ''
    is_descr = false
    content.split(/\n+/).each{|l|
        l.strip!
        if l[/^#feature\-info/]
            l = l.sub(/^#feature\-info/, '').strip
            is_descr = true
        elsif !is_descr
            next
        end
        if is_descr
            if l[/\\$/]
                descr << l.sub(/\\$/, '')
            else
                break
            end
        end
    }
    descr
end

$options = {}
optparse = OptionParser.new{|opts|

    opts.banner = "Usage: #{$0} [OPTIONS]"

    opts.separator '=' * 79
    opts.separator "\n"

    opts.on '', '--deploy DEPLOY',
            "Deploy release to DEPLOY. Allowed values: " +
            "user@host:path, sandbox" do |deploy|
        if deploy != 'sandbox'
            user_exp = /[a-z_][a-z0-9_\-]*/
            host_exp = /[a-zA-Z0-9_\-\.]+/
            path_exp = /([a-zA-Z0-9_\-\.\/]+)/
            match =
                deploy.match(/(#{user_exp})@(#{host_exp}):(#{path_exp})/)
            if match
                deploy = {user: match[1], host: match[2], path: match[3]}
            elsif (match = deploy.match(/(#{host_exp}):(#{path_exp})/))
                user = `whoami`.strip
                deploy = {user: user, host: match[2], path: match[3]}
            else
                log_error "Invalid deploy credentials"
                exit 1
            end
        else
            deploy = :sandbox
        end
        $options[:deploy] = deploy
    end

    opts.on '-h', '--help', 'Print this help' do
        STDERR.puts opts
        exit 1
    end

}

optparse.parse!

$doc_path = File.join $script_path, 'doc/PIDoc/scripts'
if !File.exists?($doc_path)
    log_error "Missing doc directory: #{$doc_path}"
    exit 1
end

pixinsight_version = get_pixinsight_version
if !pixinsight_version
    log_error "Unable to find installed PixInsight version!"
    exit 1
end
puts "PixInsight installed version: " +
     "#{color_str(pixinsight_version, bold: true)}"
$pixinsight_version_range = pixinsight_version_range(pixinsight_version)
if !$pixinsight_version_range
    log_error "Invalid PixInsight version!"
    exit 1
end

$doc_root = File.join $doc_path, $script_name
if !File.exists?($doc_root)
    log_error "Missing doc directory: #{$doc_root}"
    exit 1
end

if Dir.glob(File.join($doc_root, '*.html')).length == 0
    log_error "No documentation files found!"
    exit 1
end

patterns = %w(jsh js).map{|ext|
    File.join($script_path, "*.#{ext}")
}

log_info "Looking for sources..."
$sources = Dir.glob(patterns).select{|f|
    !EXCLUDE_SOURCES[File.basename(f)]
}
puts $sources.map{|f| " - #{File.basename(f)}"}.join("\n")

if !$sources.include?(File.join($script_path,MAIN_SRC))
    log_error "Missing main source file: #{File.join($script_path, MAIN_SRC)}"
    exit 1
end

log_info "Loading notes..."
$notes = load_release_notes
if $notes.length == 0
    log_error "No release notes!"
    exit 1
end

$curversion = $notes.first[:version]
if !$curversion
    version_src = File.join($script_path, VERSION_SRC)
    if File.exists?(version_src)
        content = File.read version_src
        if (match = content.match(/VERSION\s+"(#{VERSION_EXP})"/))
            $curversion = match[1]
        end
    end
    if !$curversion
        log_error "Could not determine current version!"
        exit 1
    end
end
log_info "Using version: #{color_str($curversion, bold: true)}"

now = Time.now
now_ts = now.strftime '%Y%m%s'
$tmppath = "/tmp/#{$script_name}-dist-#{urand2hex(6)}"
$tmpdist = $tmppath
$distfile_name = "#{$script_name}-dist-#{$curversion}-#{now_ts}.tar.gz"
$distfile = "/tmp/#{$distfile_name}"

log_info "Creating tmp directory..."
puts ' - ' + $tmppath
FileUtils.mkdir $tmppath
$src_path = File.join($tmppath, 'src/scripts', $script_name)
$doc_dest_path = File.join($tmppath, 'doc')
[$src_path, $doc_dest_path].each{|path|
    FileUtils.mkdir_p path
}
puts "Copying source files..."
$sources.each{|f|
    fname = File.basename(f)
    puts " - #{fname}"
    dest = File.join $src_path, fname
    FileUtils.cp f, dest
}
log_info "Copying documentation files..."
FileUtils.cp_r $doc_path, $doc_dest_path
log_info "Creating archive..."
tar = "cd #{$tmpdist} && tar cvzf #{File.join('/tmp',$distfile_name)} " +
      " -C #{$tmpdist} *"
out=`#{tar} 2>/dev/null`
if !$?.success? || !File.exists?($distfile)
    log_error "Failed to create archive!"
    puts color_str(tar, :magenta)
    exit 1
end

log_info "Creating updates.xri file..."
xri_file = File.join $script_path, 'resources/updates.xri'
$xri = Nokogiri::XML::Document.parse(File.read(xri_file))
descr_el = $xri.at_css 'description > p'
if descr_el
    descr_el.add_child(get_description)
else
    STDERR.puts "Missing main <description>"
end
platform_el = $xri.at_css 'platform'
platform_el['version'] = $pixinsight_version_range
package_el = $xri.at_css 'package'
package_el['fileName'] = $distfile_name
sha1 = Digest::SHA1.file($distfile).hexdigest
package_el['sha1'] = sha1
package_el['releaseDate'] = now.strftime('%Y%m%d%H%M%S')
last_update = $notes.first
title_el = package_el.at_css 'title'
descr_el = package_el.at_css 'description'
title_el.content = "#{$script_name} v#{$curversion} - released on #{now.to_s}"
descr_p = Nokogiri::XML::Node.new 'p', $xri
descr_p.content = "Latest Changes:"
descr_el.add_child descr_p
changes_list = Nokogiri::XML::Node.new 'ul', $xri
(last_update[:changes] || []).each{|change|
    item = Nokogiri::XML::Node.new 'li', $xri
    item.content = CGI.escape_html change
    changes_list.add_child item
}
descr_el.add_child changes_list
#puts $xri.to_xml
$dist_dir = File.join '/tmp', $distfile_name.sub(/\.tar.gz$/, '')
log_info "Copying files into destination directory..."
FileUtils.mkdir_p $dist_dir
FileUtils.cp File.join('/tmp', $distfile_name),
             File.join($dist_dir, $distfile_name)
$xri_file = File.join($dist_dir, 'updates.xri')
File.open($xri_file, 'w:utf-8'){|f|
    f.write $xri.to_xml
}
log_success "All files created into: #{$dist_dir}"
if (deploy = $options[:deploy])
    if deploy == :sandbox
        $sandbox_path = File.join $script_path, 'tools/sandbox_server'
        $sandbox_public_path = File.join $sandbox_path, 'public'
        log_info "Copying files to sandbox server..."
        FileUtils.cp File.join($dist_dir, $distfile_name), $sandbox_public_path
        FileUtils.cp File.join($dist_dir, 'updates.xri'), $sandbox_public_path
    else
        ssh_credentials = "#{deploy[:user]}@#{deploy[:host]}:#{deploy[:path]}"
        log_info "Uploading file to #{ssh_credentials}"
        [$distfile_name, 'updates.xri'].each{|f|
            src = File.join $dist_dir, f
            dest = File.join(ssh_credentials, f)
            cmd = "scp #{src} #{dest}"
            puts color_str(cmd, :white, dim: true)
            system cmd
        }
    end
end
