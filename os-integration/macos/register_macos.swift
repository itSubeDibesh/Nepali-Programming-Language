
import Cocoa
import CoreServices

let appPath = ("~/Applications/Nepali Studio.app" as NSString).expandingTildeInPath
let appURL = URL(fileURLWithPath: appPath)

print("Registering \(appPath) with LaunchServices...")

// 1. Unregister any stale entry and register new bundle
let lsregisterPath = "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
let p = Process()
p.executableURL = URL(fileURLWithPath: lsregisterPath)
p.arguments = ["-f", "-R", appPath]
try? p.run()
p.waitUntilExit()

// 2. Set default application for UTI org.nepalilang.source
LSSetDefaultRoleHandlerForContentType("org.nepalilang.source" as CFString, .all, "org.nepalilang.studio" as CFString)
LSSetDefaultRoleHandlerForContentType("public.source-code" as CFString, .editor, "org.nepalilang.studio" as CFString)

print("Default role handler registered!")
