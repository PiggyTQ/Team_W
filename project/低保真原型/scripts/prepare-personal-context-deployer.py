"""Derive a backend-only release runner from the previously verified deployer."""
import pathlib,ast
r=pathlib.Path(__file__).resolve().parents[1];s=(r/'deploy/backend-command-release.py').read_text(encoding='utf-8')
s=s.replace('backend-commands-20261029-02','personal-context-20261029-03')
start=s.index(' assert not RELEASE.exists();shutil.copytree');end=s.index(' installed=[]',start)
s=s[:start]+s[end:]
line="  pending=BASE/'current.backend-pending';assert not pending.exists();pending.symlink_to(RELEASE,target_is_directory=True);os.replace(pending,BASE/'current')\n"
assert s.count(line)==1;s=s.replace(line,'')
s=s.replace("'staticRelease':str(RELEASE)","'staticRelease':baseline['previousRelease'],'frontendChanged':False")
s=s.replace("'newTables':['business_command_receipts']","'newTables':['personal_context_heads','personal_context_events','personal_suggestion_feedback']")
ast.parse(s);(r/'deploy/personal-context-release.py').write_text(s,encoding='utf-8',newline='')
