const VisuallyHidden = ({ children }) => {
  return (
    <span className="absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-rect-0 border-0 whitespace-nowrap">
      {children}
    </span>
  );
};

export { VisuallyHidden }; 