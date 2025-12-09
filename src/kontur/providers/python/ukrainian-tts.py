#!/usr/bin/env python3
"""
Ukrainian TTS Wrapper for ATLAS
Uses robinhad/ukrainian-tts package
"""

import sys
import argparse
import io
import logging

# Configure logging to stderr so stdout remains clean for audio data
logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s', stream=sys.stderr)
logger = logging.getLogger('ukrainian-tts')

try:
    from ukrainian_tts.tts import TTS
except ImportError:
    logger.error("ukrainian-tts package not found. Please install it with: pip install ukrainian-tts")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Ukrainian TTS Wrapper')
    parser.add_argument('--text', type=str, help='Text to speak. If not provided, reads from stdin.')
    parser.add_argument('--voice', type=str, default='tetiana', choices=['tetiana', 'mykyta', 'lada', 'dmytro', 'oleksa'], help='Voice to use (lowercase)')
    parser.add_argument('--output', type=str, help='Output file path. If not provided, writes wav to stdout.')

    args = parser.parse_args()

    # Get text
    text = args.text
    if not text:
        if not sys.stdin.isatty():
             text = sys.stdin.read().strip()
    
    if not text:
        logger.error("No text provided.")
        sys.exit(1)

    logger.info(f"Generating audio for: {text[:50]}... (Voice: {args.voice})")

    try:
        tts = TTS(device="cpu")
        
        if args.output:
            with open(args.output, mode="wb") as f:
                tts.tts(text, args.voice.lower(), 'dictionary', f)
            logger.info(f"Audio saved to {args.output}")
        else:
            buffer = io.BytesIO()
            tts.tts(text, args.voice.lower(), 'dictionary', buffer)
            buffer.seek(0)
            sys.stdout.buffer.write(buffer.read())
            sys.stdout.buffer.flush()
            
    except Exception as e:
        logger.error(f"TTS Generation failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
