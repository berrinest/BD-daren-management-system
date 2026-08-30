from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from src.models import OcrItem, Rect
from src.vision import VisionEngine


class VisionEngineTests(unittest.TestCase):
    def test_text_filter_requires_confidence(self) -> None:
        items = [
            OcrItem("搜索", 0.91, Rect(1, 2, 30, 20)),
            OcrItem("搜索", 0.50, Rect(40, 2, 70, 20)),
        ]
        matches = VisionEngine.find_text(items, ["搜索"], 0.72, exact=True)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].confidence, 0.91)

    def test_template_matching_returns_expected_region(self) -> None:
        source = np.full((160, 240, 3), 255, dtype=np.uint8)
        cv2.rectangle(source, (70, 50), (130, 90), (0, 0, 0), 3)
        template = source[45:96, 65:136]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "template.png"
            cv2.imwrite(str(path), template)
            match = VisionEngine.match_template(Image.fromarray(source), path, 0.88)
        self.assertIsNotNone(match)
        assert match is not None
        rect, confidence = match
        self.assertGreaterEqual(confidence, 0.99)
        self.assertEqual((rect.left, rect.top), (65, 45))

    def test_input_region_is_relative_to_label(self) -> None:
        image = Image.new("RGB", (500, 300), "white")
        draw = ImageDraw.Draw(image)
        draw.rectangle((40, 80, 430, 130), outline="black", width=2)
        regions = VisionEngine.find_input_below(image, Rect(40, 40, 100, 65))
        self.assertTrue(any(region.top >= 78 and region.width > 300 for region in regions))


if __name__ == "__main__":
    unittest.main()
