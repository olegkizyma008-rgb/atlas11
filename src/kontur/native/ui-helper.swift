import Cocoa
import ApplicationServices

// MARK: - Models

struct UIElement: Codable {
    let role: String
    let title: String
    let value: String
    let help: String
    let id: String // Simulated ID based on hierarchy path or hash
    let frame: [String: Double]
}

struct AppInfo: Codable {
    let pid: Int32
    let name: String
    let bundleIdentifier: String
}

// MARK: - Core Accessibility Logic

func getAXAttribute<T>(_ element: AXUIElement, _ attribute: String) -> T? {
    var value: AnyObject?
    let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
    guard result == .success else { return nil }
    return value as? T
}

func getAXActionNames(_ element: AXUIElement) -> [String] {
    var names: CFArray?
    let result = AXUIElementCopyActionNames(element, &names)
    guard result == .success, let array = names as? [String] else { return [] }
    return array
}

func performAXAction(_ element: AXUIElement, _ action: String) -> Bool {
    let result = AXUIElementPerformAction(element, action as CFString)
    return result == .success
}

// MARK: - Recursive Tree Walker

func dumpTree(element: AXUIElement, depth: Int = 0, maxDepth: Int = 5) -> [String: Any] {
    if depth > maxDepth { return ["truncated": true] }
    
    var info: [String: Any] = [:]
    
    // Basic Attributes
    if let role: String = getAXAttribute(element, kAXRoleAttribute) { info["role"] = role }
    if let title: String = getAXAttribute(element, kAXTitleAttribute) { info["title"] = title }
    if let value: String = getAXAttribute(element, kAXValueAttribute) { info["value"] = value }
    if let help: String = getAXAttribute(element, kAXHelpAttribute) { info["help"] = help }
    
    // Position/Size (Frame)
    // Note: AXValue requires transformation, skipping for brevity in basic dump, 
    // but useful for vision mapping later.
    
    // Children
    if let children: [AXUIElement] = getAXAttribute(element, kAXChildrenAttribute) {
        info["children"] = children.map { dumpTree(element: $0, depth: depth + 1, maxDepth: maxDepth) }
    }
    
    return info
}

// MARK: - Flat Search

func findElement(element: AXUIElement, criteria: [String: String], maxDepth: Int = 10) -> AXUIElement? {
    // Check match
    var match = true
    if let role = criteria["role"], let elRole: String = getAXAttribute(element, kAXRoleAttribute) {
        if elRole != role { match = false }
    }
    if match, let title = criteria["title"], let elTitle: String = getAXAttribute(element, kAXTitleAttribute) {
        if !elTitle.localizedCaseInsensitiveContains(title) { match = false }
    }
    
    if match && !criteria.isEmpty { return element }
    
    // Search children
    // Optimization: Don't dive too deep if not needed
    if maxDepth <= 0 { return nil }
    
    if let children: [AXUIElement] = getAXAttribute(element, kAXChildrenAttribute) {
        for child in children {
            if let found = findElement(element: child, criteria: criteria, maxDepth: maxDepth - 1) {
                return found
            }
        }
    }
    
    return nil
}

// MARK: - Commands

func listApps() {
    let apps = NSWorkspace.shared.runningApplications
    let info = apps.map { app -> AppInfo in
        return AppInfo(pid: app.processIdentifier, name: app.localizedName ?? "Unknown", bundleIdentifier: app.bundleIdentifier ?? "")
    }
    
    let encoder = JSONEncoder()
    encoder.outputFormatting = .prettyPrinted
    if let data = try? encoder.encode(info) {
        print(String(data: data, encoding: .utf8) ?? "[]")
    }
}

func dumpApp(pid: Int32) {
    let app = AXUIElementCreateApplication(pid)
    let tree = dumpTree(element: app, maxDepth: 4) // Limit depth for performance
    
    if let data = try? JSONSerialization.data(withJSONObject: tree, options: .prettyPrinted) {
        print(String(data: data, encoding: .utf8) ?? "{}")
    }
}

func findAndAction(pid: Int32, role: String?, title: String?, action: String?) {
    let app = AXUIElementCreateApplication(pid)
    var criteria: [String: String] = [:]
    if let r = role { criteria["role"] = r }
    if let t = title { criteria["title"] = t }
    
    if let target = findElement(element: app, criteria: criteria) {
        print("✅ Found element.")
        
        if let act = action {
            if performAXAction(target, act) {
                print("✅ Action '\(act)' performed.")
            } else {
                print("❌ Failed to perform action '\(act)'. Available actions: \(getAXActionNames(target))")
            }
        } else {
            // Just info
            print("Actions: \(getAXActionNames(target))")
        }
    } else {
        print("❌ Element not found.")
    }
}

// MARK: - Main

func printUsage() {
    print("""
    Usage:
      list-apps
      dump-tree <pid>
      find-action <pid> <role> <title> <action>
      
      Note: Use "_" for empty criteria in find-action. e.g. find-action 1234 AXButton _ AXPress
    """)
}

let args = CommandLine.arguments

if args.count < 2 {
    printUsage()
    exit(1)
}

let command = args[1]

switch command {
case "list-apps":
    listApps()
    
case "dump-tree":
    if args.count < 3, let pid = Int32(args[2]) {
        dumpApp(pid: pid)
    } else {
        print("Usage: dump-tree <pid>")
    }

case "find-action":
    if args.count >= 6 {
        let pid = Int32(args[2]) ?? 0
        let role = args[3] == "_" ? nil : args[3]
        let title = args[4] == "_" ? nil : args[4]
        let action = args[5] == "_" ? nil : args[5]
        
        findAndAction(pid: pid, role: role, title: title, action: action)
    } else {
         print("Usage: find-action <pid> <role> <title> <action>")
    }
    
default:
    printUsage()
}
