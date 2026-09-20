
import Cocoa

func renderIcon(size: CGFloat, isDoc: Bool) -> NSImage {
    let img = NSImage(size: NSSize(width: size, height: size))
    img.lockFocus()
    let ctx = NSGraphicsContext.current!.cgContext
    
    let scale = size / 512.0
    
    if isDoc {
        // --- Document Icon (Paper shape with folded corner) ---
        let margin: CGFloat = 40 * scale
        let w = size - 2 * margin
        let h = size - 2 * margin * 0.9
        let corner: CGFloat = 80 * scale
        let r: CGFloat = 24 * scale
        
        let docPath = NSBezierPath()
        docPath.move(to: NSPoint(x: margin + r, y: margin))
        docPath.line(to: NSPoint(x: margin + w - r, y: margin))
        docPath.appendArc(from: NSPoint(x: margin + w, y: margin), to: NSPoint(x: margin + w, y: margin + r), radius: r)
        docPath.line(to: NSPoint(x: margin + w, y: margin + h - corner))
        docPath.line(to: NSPoint(x: margin + w - corner, y: margin + h))
        docPath.line(to: NSPoint(x: margin + r, y: margin + h))
        docPath.appendArc(from: NSPoint(x: margin, y: margin + h), to: NSPoint(x: margin, y: margin + h - r), radius: r)
        docPath.line(to: NSPoint(x: margin, y: margin + r))
        docPath.appendArc(from: NSPoint(x: margin, y: margin), to: NSPoint(x: margin + r, y: margin), radius: r)
        docPath.close()
        
        // Shadow
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -10 * scale), blur: 25 * scale, color: NSColor(white: 0, alpha: 0.35).cgColor)
        NSColor(calibratedRed: 0.96, green: 0.97, blue: 0.99, alpha: 1.0).setFill()
        docPath.fill()
        ctx.restoreGState()
        
        // Document Gradient
        let gradient = NSGradient(starting: NSColor(calibratedRed: 0.98, green: 0.99, blue: 1.0, alpha: 1.0),
                                  ending: NSColor(calibratedRed: 0.88, green: 0.91, blue: 0.95, alpha: 1.0))
        gradient?.draw(in: docPath, angle: -45)
        
        // Border
        NSColor(calibratedRed: 0.75, green: 0.80, blue: 0.86, alpha: 0.8).setStroke()
        docPath.lineWidth = 2 * scale
        docPath.stroke()
        
        // Folded Corner Flap
        let flap = NSBezierPath()
        flap.move(to: NSPoint(x: margin + w - corner, y: margin + h))
        flap.line(to: NSPoint(x: margin + w - corner, y: margin + h - corner + r * 0.5))
        flap.appendArc(from: NSPoint(x: margin + w - corner, y: margin + h - corner), to: NSPoint(x: margin + w - corner + r * 0.5, y: margin + h - corner), radius: r * 0.5)
        flap.line(to: NSPoint(x: margin + w, y: margin + h - corner))
        flap.close()
        
        NSColor(calibratedRed: 0.82, green: 0.85, blue: 0.90, alpha: 1.0).setFill()
        flap.fill()
        NSColor(calibratedRed: 0.70, green: 0.74, blue: 0.80, alpha: 1.0).setStroke()
        flap.lineWidth = 2 * scale
        flap.stroke()
        
        // Inner Badge (Crimson & Emerald with 'नेपाली')
        let badgeRect = NSRect(x: margin + (w - 260 * scale)/2, y: margin + 80 * scale, width: 260 * scale, height: 180 * scale)
        let badgePath = NSBezierPath(roundedRect: badgeRect, xRadius: 20 * scale, yRadius: 20 * scale)
        NSColor(calibratedRed: 0.05, green: 0.08, blue: 0.14, alpha: 1.0).setFill()
        badgePath.fill()
        NSColor(calibratedRed: 0.10, green: 0.75, blue: 0.45, alpha: 0.9).setStroke()
        badgePath.lineWidth = 3 * scale
        badgePath.stroke()
        
        // Devanagari text inside badge
        let str = "नेपाली" as NSString
        let font = NSFont(name: "Kohinoor Devanagari-Bold", size: 64 * scale) ?? NSFont.boldSystemFont(ofSize: 64 * scale)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: NSColor(calibratedRed: 0.20, green: 0.90, blue: 0.55, alpha: 1.0)
        ]
        let strSize = str.size(withAttributes: attrs)
        let strRect = NSRect(x: badgeRect.midX - strSize.width/2, y: badgeRect.midY - strSize.height/2 + 10 * scale, width: strSize.width, height: strSize.height)
        str.draw(in: strRect, withAttributes: attrs)
        
        // Sub-text ".nep / .नेपाली"
        let extStr = "SOURCE CODE" as NSString
        let extFont = NSFont.monospacedSystemFont(ofSize: 18 * scale, weight: .bold)
        let extAttrs: [NSAttributedString.Key: Any] = [
            .font: extFont,
            .foregroundColor: NSColor(calibratedRed: 0.60, green: 0.70, blue: 0.80, alpha: 1.0)
        ]
        let extSize = extStr.size(withAttributes: extAttrs)
        let extRect = NSRect(x: badgeRect.midX - extSize.width/2, y: badgeRect.minY + 16 * scale, width: extSize.width, height: extSize.height)
        extStr.draw(in: extRect, withAttributes: extAttrs)
        
    } else {
        // --- App Icon (Squircle Obsidian & Emerald) ---
        let rect = NSRect(x: 36 * scale, y: 36 * scale, width: size - 72 * scale, height: size - 72 * scale)
        let path = NSBezierPath(roundedRect: rect, xRadius: 100 * scale, yRadius: 100 * scale)
        
        // Shadow
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -12 * scale), blur: 28 * scale, color: NSColor(white: 0, alpha: 0.5).cgColor)
        NSColor(calibratedRed: 0.05, green: 0.08, blue: 0.15, alpha: 1.0).setFill()
        path.fill()
        ctx.restoreGState()
        
        // Dark Obsidian Gradient
        let gradient = NSGradient(starting: NSColor(calibratedRed: 0.08, green: 0.13, blue: 0.22, alpha: 1.0),
                                  ending: NSColor(calibratedRed: 0.02, green: 0.04, blue: 0.08, alpha: 1.0))
        gradient?.draw(in: path, angle: -45)
        
        // Border
        NSColor(calibratedRed: 0.10, green: 0.75, blue: 0.45, alpha: 0.85).setStroke()
        path.lineWidth = 6 * scale
        path.stroke()
        
        // Center Devanagari Emblem "ने"
        let str = "ने" as NSString
        let font = NSFont(name: "Kohinoor Devanagari-Bold", size: 240 * scale) ?? NSFont.boldSystemFont(ofSize: 240 * scale)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: NSColor(calibratedRed: 0.15, green: 0.88, blue: 0.52, alpha: 1.0)
        ]
        let strSize = str.size(withAttributes: attrs)
        let strRect = NSRect(x: (size - strSize.width)/2, y: (size - strSize.height)/2 + 25 * scale, width: strSize.width, height: strSize.height)
        str.draw(in: strRect, withAttributes: attrs)
        
        // Bottom "STUDIO" Banner
        let sub = "STUDIO" as NSString
        let subFont = NSFont.monospacedSystemFont(ofSize: 32 * scale, weight: .heavy)
        let subAttrs: [NSAttributedString.Key: Any] = [
            .font: subFont,
            .foregroundColor: NSColor(calibratedRed: 0.90, green: 0.95, blue: 1.0, alpha: 0.9)
        ]
        let subSize = sub.size(withAttributes: subAttrs)
        let subRect = NSRect(x: (size - subSize.width)/2, y: 70 * scale, width: subSize.width, height: subSize.height)
        sub.draw(in: subRect, withAttributes: subAttrs)
    }
    
    img.unlockFocus()
    return img
}

func buildIconset(isDoc: Bool, outIcnsPath: String) {
    let tag = isDoc ? "doc" : "app"
    let tempDir = URL(fileURLWithPath: "/tmp/nepali_icon_\(tag).iconset")
    try? FileManager.default.removeItem(at: tempDir)
    try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    
    let sizes: [(String, CGFloat)] = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024)
    ]
    
    for (name, sz) in sizes {
        let img = renderIcon(size: sz, isDoc: isDoc)
        if let tiff = img.tiffRepresentation,
           let bitmap = NSBitmapImageRep(data: tiff),
           let png = bitmap.representation(using: .png, properties: [:]) {
            let fileURL = tempDir.appendingPathComponent(name)
            try? png.write(to: fileURL)
        }
    }
    
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
    process.arguments = ["-c", "icns", tempDir.path, "-o", outIcnsPath]
    try? process.run()
    process.waitUntilExit()
    
    try? FileManager.default.removeItem(at: tempDir)
    print("Generated: \(outIcnsPath)")
}

let base = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
buildIconset(isDoc: false, outIcnsPath: "\(base)/AppIcon.icns")
buildIconset(isDoc: true, outIcnsPath: "\(base)/DocIcon.icns")
