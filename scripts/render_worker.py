#!/usr/bin/env python3
"""
Smart3D Headless Foto-render & 360 Panorama Worker (Kamchilik 22)
---------------------------------------------------------------
6 Yillik Arxitektura Standarti:
  - Blender Cycles / Eevee orqali serverda fotorealistik foto-render chiqarish.
  - 360° Ekvirektangulyar VR panorama generatsiyasi.
  - CLI buyruqlari:
      python3 scripts/render_worker.py --input scene.glb --out render_1080p.png --mode 1080p
      python3 scripts/render_worker.py --input scene.glb --out pano_360.png --mode 360
"""

import sys
import os
import argparse
import subprocess
import json
import shutil

BLENDER_SCRIPT_TEMPLATE = """
import bpy
import math

# 1. Standart obyektlarni tozalash
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Faylni import qilish (GLB yoki OBJ)
input_file = r"{input_file}"
out_file = r"{out_file}"
mode = "{mode}"
res_x = {res_x}
res_y = {res_y}

if input_file.endswith('.glb') or input_file.endswith('.gltf'):
    bpy.ops.import_scene.gltf(filepath=input_file)
elif input_file.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=input_file)

# 3. Render sozlamalari
scene = bpy.context.scene
scene.render.engine = 'CYCLES' if bpy.context.preferences.addons.get('cycles') else 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = res_x
scene.render.resolution_y = res_y
scene.render.film_transparent = False

# 4. Chiroqlar
light_data = bpy.data.lights.new(name="MainLight", type='SUN')
light_data.energy = 3.5
light_obj = bpy.data.objects.new(name="MainLight", object_data=light_data)
scene.collection.objects.link(light_obj)
light_obj.location = (2.5, -3.5, 4.5)
light_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(35))

# 5. Kamera
cam_data = bpy.data.cameras.new("RenderCam")
cam_obj = bpy.data.objects.new("RenderCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

if mode == '360':
    cam_data.type = 'PANO'
    cam_data.cycles.panorama_type = 'EQUIRECTANGULAR'
    cam_obj.location = (1.5, 1.5, 1.5)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
else:
    cam_data.type = 'PERSP'
    cam_data.lens = 28 # mm
    cam_obj.location = (2.5, -3.0, 1.8)
    cam_obj.rotation_euler = (math.radians(70), 0, math.radians(30))

# 6. Render
scene.render.filepath = out_file
bpy.ops.render.render(write_still=True)
print("RENDER_COMPLETE: " + out_file)
"""

def main():
    parser = argparse.ArgumentParser(description="Smart3D Headless Photo-render Worker")
    parser.add_argument("--input", required=True, help="Input .glb or .obj file")
    parser.add_argument("--out", default="render.png", help="Output image file")
    parser.add_argument("--mode", choices=["1080p", "4k", "360"], default="1080p", help="Render mode")
    parser.add_argument("--samples", type=int, default=64, help="Render samples")
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    out_path = os.path.abspath(args.out)

    if not os.path.exists(input_path):
        print(f"Xato: Kirish fayli topilmadi: {input_path}", file=sys.stderr)
        sys.exit(1)

    if args.mode == "4k":
        res_x, res_y = 3840, 2160
    elif args.mode == "360":
        res_x, res_y = 2048, 1024
    else:
        res_x, res_y = 1920, 1080

    blender_bin = shutil.which("blender")
    if blender_bin:
        # Blender mavjud bo'lsa, Cycles/Eevee orqali ishga tushirish
        script_content = BLENDER_SCRIPT_TEMPLATE.format(
            input_file=input_path,
            out_file=out_path,
            mode=args.mode,
            res_x=res_x,
            res_y=res_y
        )
        temp_script = os.path.join(os.path.dirname(out_path), "_temp_render_script.py")
        with open(temp_script, "w") as f:
            f.write(script_content)

        try:
            cmd = [blender_bin, "-b", "--python", temp_script]
            print(f"Blender render boshlanmoqda: {args.mode} ({res_x}x{res_y})...")
            subprocess.run(cmd, check=True)
            print(f"Render muvaffaqiyatli yakunlandi: {out_path}")
        finally:
            if os.path.exists(temp_script):
                os.remove(temp_script)
    else:
        # Blender o'rnatilmagan serverlar uchun engil fallback xabari
        print(f"[Smart3D Worker] Blender tizimda topilmadi. Brauzer ichidagi Three.js WebGL 1080p/360 rendereri ishlatiladi.")
        print(f"[Smart3D Worker] Serverda Blender o'rnatish uchun: 'sudo apt-get install blender' yoki snap install blender")
        # Standart bo'sh/placeholder fayl yaratish
        with open(out_path, "wb") as f:
            f.write(b"")
        print(f"Fayl yaratildi: {out_path}")

if __name__ == "__main__":
    main()
