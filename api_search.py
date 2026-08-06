with open(r"C:\Users\13900K\Desktop\suerte rd\index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "iPhone" in line or "Celular" in line or "celular" in line:
        print(f"Line {i+1}: {line.strip()}")
