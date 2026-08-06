with open(r"C:\Users\13900K\Desktop\suerte rd\assets\js\app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const $" in line or "function $" in line:
        print(f"Line {i+1}: {line.strip()}")
