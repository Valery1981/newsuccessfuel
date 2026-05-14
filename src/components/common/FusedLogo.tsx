import Image from "next/image";

export function FusedLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
      }}
    >
      <Image
        src="/favicon.png"
        alt="SuccessFuel"
        width={size * 0.5}
        height={size * 0.5}
        style={{ objectFit: "contain", width: "auto", height: "auto" }}
      />
      <Image
        src="/name.png"
        alt="SuccessFuel"
        width={size * 0.6}
        height={size * 0.4}
        style={{
          objectFit: "contain",
          width: "auto",
          height: "auto",
          marginTop: -2,
        }}
      />
    </div>
  );
}
