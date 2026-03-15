from src.schema import BBox, Detection, TimedEvent, Sequence, RenderList


def test_bbox_creation():
    bbox = BBox(x=10, y=20, width=100, height=50)
    assert bbox.x == 10
    assert bbox.width == 100


def test_detection_creation():
    det = Detection(
        class_name="car",
        confidence=0.95,
        bbox=BBox(x=0, y=0, width=100, height=100),
        frame_index=42,
        timestamp=1.4,
    )
    assert det.class_name == "car"
    assert det.confidence == 0.95


def test_sequence_duration():
    seq = Sequence(
        id="s1",
        label="Test",
        source_video="/tmp/test.mp4",
        in_point=1.0,
        out_point=5.0,
        in_frame=30,
        out_frame=150,
    )
    assert seq.out_point - seq.in_point == 4.0


def test_render_list():
    rl = RenderList(
        id="r1",
        name="Test Render",
        sequences=[],
        total_duration=0,
    )
    assert len(rl.sequences) == 0
