# mac_accessibility.py
import time
import Quartz
from ApplicationServices import (
    AXUIElementCreateSystemWide,
    AXUIElementCreateApplication,
    AXUIElementCopyAttributeValue,
    kAXFocusedApplicationAttribute,
    kAXPositionAttribute,
    kAXSizeAttribute
)

def get_ax_attribute(element, attribute):
    try:
        error, value = AXUIElementCopyAttributeValue(element, attribute, None)
        if error == 0:
            return value
    except Exception:
        pass
    return None

def click_element(ax_element):
    """
    Clicks the center of an AXUIElement using Quartz events.
    """
    try:
        # Get Position and Size
        pos_value = get_ax_attribute(ax_element, kAXPositionAttribute)
        size_value = get_ax_attribute(ax_element, kAXSizeAttribute)
        
        if pos_value is None or size_value is None:
            print("Could not get element position/size")
            return

        # AXValue (struct) to Python tuple conversion happens via pyobjc bridge usually, 
        # but sometimes values are wrapped.
        # Assuming direct access if PyObjC wraps them nicely:
        x, y = pos_value.x, pos_value.y
        w, h = size_value.width, size_value.height
        
        center_x = x + (w / 2)
        center_y = y + (h / 2)
        
        _mouse_event(Quartz.kCGEventLeftMouseDown, center_x, center_y)
        _mouse_event(Quartz.kCGEventLeftMouseUp, center_x, center_y)
        
    except Exception as e:
        print(f"Error clicking element: {e}")

def _mouse_event(type, x, y):
    ev = Quartz.CGEventCreateMouseEvent(None, type, (x, y), Quartz.kCGMouseButtonLeft)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev)

def type_text(text):
    """
    Types text using Quartz keyboard events.
    """
    try:
        # Simple implementation using AppleScript for reliability with special chars
        # or Quartz for raw keys. Using AppleScript is often safer for "typing string".
        # But let's try Quartz for strict python compliance or fallback to simple string typing.
        
        # Method 1: PyObjC Quartz EventSource
        src = Quartz.CGEventSourceCreate(Quartz.kCGEventSourceStateHIDSystemState)
        for char in text:
            # This is complex to map all chars to keycodes manually without a table.
            # Fallback to AppleScript for reliable string typing.
            esc_char = char.replace('"', '\\"').replace('\\', '\\\\')
            cmd = f'tell application "System Events" to keystroke "{esc_char}"'
            os.system(f"osascript -e '{cmd}'")
            time.sleep(0.01)
            
    except Exception as e:
        print(f"Error typing text: {e}")

import os

def get_ui_tree():
    """
    Returns the AXUIElement for the focused application.
    """
    try:
        system = AXUIElementCreateSystemWide()
        # Get focused app
        error, app_ref = AXUIElementCopyAttributeValue(system, kAXFocusedApplicationAttribute, None)
        if error == 0:
            return app_ref
    except Exception as e:
        print(f"Error getting UI tree: {e}")
    return None
