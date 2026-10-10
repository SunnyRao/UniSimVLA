#!/usr/bin/env bash
# 把任意视频转成浏览器可直接播放的网页版 mp4（H.264 + yuv420p + faststart），并抽一张封面图。
#
# 用法：
#   tools/prepare_video.sh <输入视频> <输出名> [选项]
#
# 选项：
#   --start S      从第 S 秒开始截取（默认 0）
#   --duration D   只保留 D 秒（默认整段）
#   --speed X      播放加速倍数，例如 2 表示两倍速（默认 1）
#   --width W      最大宽度，超过则等比缩放（默认 960）
#   --crf N        画质，越大体积越小（默认 26，常用 23~30）
#   --poster T     封面取自输出视频的第 T 秒（默认 1）
#
# 产物：
#   static/videos/<输出名>.mp4
#   static/images/posters/<输出名>.jpg
#
# 说明：Isaac Sim / OpenCV 默认写出的 mp4 是 MPEG-4 Part 2（mp4v），Chrome 无法播放，
#       必须转成 H.264。GitHub 单文件超过 100MB 会拒收，且 Pages 不支持 Git LFS，
#       建议每个视频控制在 20MB 以内。
set -euo pipefail

if [[ $# -lt 2 ]]; then
    sed -n '2,20p' "$0"
    exit 1
fi

IN="$1"; NAME="$2"; shift 2
START=0; DURATION=""; SPEED=1; WIDTH=960; CRF=26; POSTER_T=1
while [[ $# -gt 0 ]]; do
    case "$1" in
        --start) START="$2"; shift 2 ;;
        --duration) DURATION="$2"; shift 2 ;;
        --speed) SPEED="$2"; shift 2 ;;
        --width) WIDTH="$2"; shift 2 ;;
        --crf) CRF="$2"; shift 2 ;;
        --poster) POSTER_T="$2"; shift 2 ;;
        *) echo "未知参数: $1" >&2; exit 1 ;;
    esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_VIDEO="$ROOT/static/videos/$NAME.mp4"
OUT_POSTER="$ROOT/static/images/posters/$NAME.jpg"
mkdir -p "$(dirname "$OUT_VIDEO")" "$(dirname "$OUT_POSTER")"

TRIM=(-ss "$START")
[[ -n "$DURATION" ]] && TRIM+=(-t "$DURATION")

# 宽度取 min(原宽, WIDTH)，高度按比例并保证偶数（yuv420p 要求）
VF="setpts=PTS/${SPEED},scale='min(${WIDTH},iw)':-2:flags=lanczos,format=yuv420p"

ffmpeg -hide_banner -loglevel error -y "${TRIM[@]}" -i "$IN" \
    -vf "$VF" -an \
    -c:v libx264 -preset slow -crf "$CRF" -profile:v high -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUT_VIDEO"

ffmpeg -hide_banner -loglevel error -y -ss "$POSTER_T" -i "$OUT_VIDEO" \
    -frames:v 1 -q:v 4 "$OUT_POSTER" \
    || ffmpeg -hide_banner -loglevel error -y -i "$OUT_VIDEO" -frames:v 1 -q:v 4 "$OUT_POSTER"

SIZE_MB=$(du -m "$OUT_VIDEO" | cut -f1)
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT_VIDEO")
printf '%-36s %6.1fs  %4sMB\n' "static/videos/$NAME.mp4" "$DUR" "$SIZE_MB"
if (( SIZE_MB > 50 )); then
    echo "  警告：超过 50MB，建议调大 --crf、减小 --width 或截短 --duration" >&2
fi
