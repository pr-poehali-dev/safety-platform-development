import logo from "@/assets/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = "" }: LogoProps) {
  return (
    <img
      src={logo}
      alt="Логотип"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
