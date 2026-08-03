import { passwordChecks } from '../utils/password';

interface PasswordChecklistProps {
  password: string;
}

function CheckItem({ valid, label }: { valid: boolean; label: string }) {
  return (
    <li className={['flex items-center gap-2 text-sm', valid ? 'text-green-600 font-medium' : 'text-slate-400'].join(' ')}>
      <span className={['h-1.5 w-1.5 rounded-full', valid ? 'bg-green-500' : 'bg-slate-300'].join(' ')} />
      {label}
    </li>
  );
}

export default function PasswordChecklist({ password }: PasswordChecklistProps) {
  const checks = passwordChecks(password);
  return (
    <ul className="mt-3 grid gap-1.5">
      <CheckItem valid={checks.length} label="Tối thiểu 8 ký tự" />
      <CheckItem valid={checks.letter} label="Có ít nhất một chữ cái" />
      <CheckItem valid={checks.digit} label="Có ít nhất một chữ số" />
    </ul>
  );
}
