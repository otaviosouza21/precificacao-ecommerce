type TitlePrimaryTypes = {
  title: string;
  subtitle?: string;
  size?: string;
};

export default function TitlePrimary({
  title,
  subtitle,
  size = "text-2xl",
}: TitlePrimaryTypes) {
  return (
    <div>
      <h1 className={`${size} font-semibold`}>{title}</h1>
      {subtitle && <p className="text-sky-950">{subtitle}</p>}
    </div>
  );
}
