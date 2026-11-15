import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";

export default function ItemImage({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className={`item-visual ${className}`}>
      {src && !broken ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="object-placeholder">
          <Icon name="image" size={38} />
          <span>
            {src ? "Photo indisponible" : "L’objet se dévoile bientôt"}
          </span>
        </div>
      )}
    </div>
  );
}
