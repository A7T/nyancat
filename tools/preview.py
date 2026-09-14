"""Export the C renderer's actual frames as a nearest-neighbor GIF preview."""
from pathlib import Path
from io import BytesIO
import subprocess
from PIL import Image
root = Path(__file__).resolve().parents[1]
frames = [Image.open(BytesIO(subprocess.check_output([str(root/'src/nyan10chan'),'--ppm',str(i)]))).resize((800,500),Image.Resampling.NEAREST) for i in range(24)]
frames[0].save(root/'assets/preview.gif',save_all=True,append_images=frames[1:],duration=90,loop=0,optimize=False)
print('Exported 24 frames directly from nyan10chan.')
