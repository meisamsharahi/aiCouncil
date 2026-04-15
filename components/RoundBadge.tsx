interface RoundBadgeProps {
  round: number;
  total?: number;
}

export default function RoundBadge({ round, total }: RoundBadgeProps) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#6264a7]/15 text-[#bdbde6] border border-[#6264a7]/20">
      Round {round}{total ? `/${total}` : ""}
    </span>
  );
}
