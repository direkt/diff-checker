export default function FontDemo() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Geist Font Demo</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Font Weights</h2>
          <div className="space-y-2">
            <p className="font-light text-lg">Light: The quick brown fox jumps over the lazy dog</p>
            <p className="font-normal text-lg">Normal: The quick brown fox jumps over the lazy dog</p>
            <p className="font-medium text-lg">Medium: The quick brown fox jumps over the lazy dog</p>
            <p className="font-semibold text-lg">Semibold: The quick brown fox jumps over the lazy dog</p>
            <p className="font-bold text-lg">Bold: The quick brown fox jumps over the lazy dog</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Font Sizes</h2>
          <div className="space-y-2">
            <p className="text-xs">Extra Small (12px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-sm">Small (14px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-base">Base (16px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-lg">Large (18px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-xl">Extra Large (20px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-2xl">2XL (24px): The quick brown fox jumps over the lazy dog</p>
            <p className="text-3xl">3XL (30px): The quick brown fox jumps over the lazy dog</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Sample Content</h2>
          <div className="prose max-w-none">
            <p className="text-base leading-relaxed">
              Geist is a modern, clean typeface designed for optimal readability across digital interfaces. 
              It features excellent legibility at various sizes and weights, making it perfect for both 
              body text and headings in web applications.
            </p>
            <p className="text-base leading-relaxed mt-4">
              This font demo showcases how Geist performs in different contexts within the Dremio Query 
              Diff Checker application, ensuring consistent typography throughout the user interface.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
} 