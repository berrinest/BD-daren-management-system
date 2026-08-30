from __future__ import annotations

from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from .models import OcrItem, Rect


class VisionEngine:
    def __init__(self) -> None:
        self.ocr = RapidOCR()

    def read(self, image: Image.Image) -> list[OcrItem]:
        rgb = np.asarray(image.convert("RGB"))
        result, _elapsed = self.ocr(rgb)
        items: list[OcrItem] = []
        for box, text, confidence in result or []:
            points = np.asarray(box, dtype=np.float32)
            items.append(
                OcrItem(
                    text=str(text).strip(),
                    confidence=float(confidence),
                    rect=Rect(
                        int(points[:, 0].min()),
                        int(points[:, 1].min()),
                        int(points[:, 0].max()),
                        int(points[:, 1].max()),
                    ),
                )
            )
        return items

    @staticmethod
    def find_text(
        items: Iterable[OcrItem],
        terms: Iterable[str],
        min_confidence: float,
        exact: bool = False,
    ) -> list[OcrItem]:
        normalized = [term.strip().lower() for term in terms if term.strip()]
        return [
            item
            for item in items
            if item.confidence >= min_confidence
            and any(
                item.text.lower() == term if exact else term in item.text.lower()
                for term in normalized
            )
        ]

    @staticmethod
    def match_template(
        image: Image.Image,
        template_path: Path,
        min_confidence: float,
    ) -> tuple[Rect, float] | None:
        if not template_path.exists():
            return None
        source = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
        template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)
        if template is None or template.shape[0] > source.shape[0] or template.shape[1] > source.shape[1]:
            return None
        result = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
        _min_value, max_value, _min_location, max_location = cv2.minMaxLoc(result)
        if float(max_value) < min_confidence:
            return None
        x, y = max_location
        height, width = template.shape[:2]
        return Rect(x, y, x + width, y + height), float(max_value)

    @staticmethod
    def find_input_below(image: Image.Image, label: Rect) -> list[Rect]:
        """Find bordered input regions near an OCR-confirmed label, not desktop coordinates."""
        source = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(source, 40, 120)
        contours, _hierarchy = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        candidates: list[Rect] = []
        for contour in contours:
            x, y, width, height = cv2.boundingRect(contour)
            if width < 180 or height < 24 or height > 160:
                continue
            if y < label.bottom - 8 or y > label.bottom + 180:
                continue
            if x > label.right + 120 or x + width < label.left - 40:
                continue
            candidates.append(Rect(x, y, x + width, y + height))
        unique = {(item.left, item.top, item.right, item.bottom): item for item in candidates}
        return sorted(unique.values(), key=lambda item: (item.top, -item.width))

    @staticmethod
    def find_search_regions(image: Image.Image) -> list[Rect]:
        """Locate the top-left search field from its visual border geometry."""
        source = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(source, 25, 90)
        contours, _hierarchy = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        candidates: list[Rect] = []
        image_width = source.shape[1]
        for contour in contours:
            x, y, width, height = cv2.boundingRect(contour)
            if x < 40 or x > image_width * 0.35 or y < 30 or y > 110:
                continue
            if width < 170 or width > image_width * 0.35 or height < 25 or height > 70:
                continue
            candidates.append(Rect(x, y, x + width, y + height))
        # Nested antialiased borders produce near-identical contours; merge them.
        merged: list[Rect] = []
        for item in sorted(candidates, key=lambda rect: rect.width * rect.height, reverse=True):
            if any(abs(item.left - old.left) < 6 and abs(item.top - old.top) < 6 for old in merged):
                continue
            merged.append(item)
        return merged
