"""Fix RT_GROUP_ICON ID to 32512 in PE. Called by build.ts after rcedit."""
import lief, sys, os

exe_path = sys.argv[1] if len(sys.argv) > 1 else None
ico_path = sys.argv[2] if len(sys.argv) > 2 else None
if not exe_path or not os.path.exists(exe_path):
    sys.exit(0)
if not ico_path or not os.path.exists(ico_path):
    sys.exit(0)

binary = lief.parse(exe_path)
root = binary.resources
if not root:
    print("  No resource tree found")
    sys.exit(0)

fixed = False
def fix_icon_id(node):
    global fixed
    if not node.is_directory:
        return
    for child in node.childs:
        if node.id == 14 and child.id == 0:
            print(f"  Fixing RT_GROUP_ICON ID: 0 -> 32512")
            child.id = 32512
            fixed = True
        fix_icon_id(child)

fix_icon_id(root)
if fixed:
    binary.write(exe_path)
    print(f"  Icon group ID fixed in {exe_path}")
else:
    print(f"  No RT_GROUP_ICON with ID=0 found (already correct)")
