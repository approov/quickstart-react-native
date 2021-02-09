require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-approov"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  react-native-approov
                   DESC
  s.homepage     = "https://github.com/approov/react-native-approov"
  # brief license entry:
  s.license      = "MIT"
  # optional - use expanded license entry instead:
  # s.license    = { :type => "MIT", :file => "LICENSE" }
  s.authors      = { "CriticalBlue, Ltd." => "support@approov.io" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/approov/react-native-approov.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,c,m,swift}"
  s.requires_arc = true
  s.resources = "ios/**/approov.{config,plist}"

  s.ios.vendored_frameworks = "**/ios/Approov.framework"

  s.dependency "React"
end
