with open(r"C:\Users\13900K\Desktop\suerte rd\assets\css\style.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "lotto-balls" in line:
        print(f"Line {i+1}: {line.strip()}")
