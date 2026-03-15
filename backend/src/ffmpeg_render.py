"""FFmpeg render pipeline — builds concat demuxer for NDE sequence stitching."""

from __future__ import annotations

import asyncio
import json
import tempfile
from pathlib import Path

from .schema import RenderList


async def render_sequence(
    render_list_path: str,
    output_path: str,
    reencode: bool = False,
) -> None:
    """Render a sequence list to an output file using ffmpeg.

    Default mode uses stream copy (-c copy) for near-instant stitching.
    Re-encode mode uses libx264 for frame-accurate cuts.
    """
    with open(render_list_path) as f:
        data = json.load(f)
    render_list = RenderList(**data)

    # Build individual segment files and concat list
    with tempfile.TemporaryDirectory() as tmpdir:
        segment_paths: list[str] = []

        for i, seq in enumerate(render_list.sequences):
            seg_path = str(Path(tmpdir) / f"segment_{i:04d}.mp4")
            segment_paths.append(seg_path)

            # Extract segment
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(seq.in_point),
                "-to", str(seq.out_point),
                "-i", seq.source_video,
            ]

            if reencode:
                cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac"])
            else:
                cmd.extend(["-c", "copy"])

            cmd.append(seg_path)

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"FFmpeg segment extraction failed: {stderr.decode()}")

        # Write concat demuxer file
        concat_path = str(Path(tmpdir) / "concat.txt")
        with open(concat_path, "w") as f:
            for seg in segment_paths:
                f.write(f"file '{seg}'\n")

        # Concatenate
        concat_cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_path,
            "-c", "copy",
            output_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *concat_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg concat failed: {stderr.decode()}")
