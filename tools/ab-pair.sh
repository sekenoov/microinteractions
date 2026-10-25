# ab.sh A.mp4 B-cover.jpg B.mp4 ovdir out.mp4  → 4:5, A играет, потом B
A=$1;BC=$2;B=$3;OV=$4;OUT=$5
ffmpeg -v error -y -i $A -i $B -loop 1 -framerate 60 -t 7.6 -i $BC -i $OV/ov1.png -i $OV/ov2.png -filter_complex "
color=c=0x0b0b0b:s=1080x1350:r=60:d=15.2[bg];
[0:v]scale=1080:608,setsar=1,tpad=stop_mode=clone:stop_duration=7.6,eq=brightness=-0.16:saturation=0.55:enable='gte(t,7.6)'[A];
[2:v]scale=1080:608,setsar=1,eq=brightness=-0.16:saturation=0.55,fps=60[Bs];[1:v]scale=1080:608,setsar=1,fps=60[Bv];[Bs][Bv]concat=n=2:v=1:a=0[B];
[bg][A]overlay=0:56[t1];[t1][B]overlay=0:727[t2];[t2][3:v]overlay=0:0:enable='lt(t,7.6)'[t3];[t3][4:v]overlay=0:0:enable='gte(t,7.6)',trim=duration=15.2[v];
[0:a]loudnorm=I=-18:TP=-1.5:LRA=11,aresample=48000[a0];[1:a]loudnorm=I=-18:TP=-1.5:LRA=11,aresample=48000[a1];[a0][a1]concat=n=2:v=0:a=1[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart $OUT
