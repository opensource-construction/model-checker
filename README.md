# Model Checker

![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

A web-based application for validating IFC (Industry Foundation Classes) models against common issues and IDS (Information Delivery Specification) requirements. The Model Checker helps ensure high-quality BIM data in AEC (Architecture, Engineering, and Construction) projects.

## 🌐 Live Application

Try out the application at [https://modelcheck.opensource.construction](https://modelcheck.opensource.construction)

## ✨ Features

- **Client-side Processing**: All file processing happens in your browser using WASM technology - no data is sent to servers
- **Standard Validation**: Check IFC models against common issues like naming conventions, relationships, and more
- **IDS Validation**: Validate IFC models against custom IDS (Information Delivery Specification) requirements
- **Multiple Report Formats**:
  - View HTML reports directly in browser
  - Download BCF (BIM Collaboration Format) reports for use in other BIM tools
- **Multi-language Support**: Available in multiple languages:
  - English
  - German
  - French
  - Italian
  - Romansh
- **Browser-based Python**: Utilizes Pyodide to run Python code (IfcOpenShell and IfcTester) directly in the browser

## 🚀 Getting Started

### Prerequisites

- Node.js v20 or later
- Modern web browser (Chrome, Firefox, Edge, etc.)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/opensourceconstruction/model-checker.git
   cd model-checker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## 📖 Usage

### Standard Validation

1. Open the application in your browser
2. Drag and drop your IFC file(s) onto the upload area, or click to select files
3. Click "Validate" to start the validation process
4. View the results directly in the browser, including:
   - Project, site, and building relationships
   - Element naming conventions
   - Material associations
   - Type definitions
   - And more...

### IDS Validation

1. Enable IDS validation by toggling the switch
2. Upload both your IFC file(s) and an IDS specification file
3. Select your preferred report format(s):
   - HTML Report (view in browser)
   - BCF Report (download for use in BIM tools)
4. Click "Validate" to start the process
5. Review the detailed validation results

## 🔧 Development

### Project Structure

```
model-checker/
├── public/              # Static assets and Python files
│   ├── locales/         # Translation files
│   ├── python/          # Python scripts
│   └── pyodideWorkerClean.js # Web worker for Pyodide
├── src/                 # Source code
│   ├── assets/          # Images and assets
│   ├── components/      # React components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── main.tsx         # Application entry point
└── ...                  # Configuration files
```

### Build for Production

```bash
npm run build
```

The production-ready files will be generated in the `dist` directory.

### Running Tests

```bash
npm run test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [IfcOpenShell](https://ifcopenshell.org/) - Open source IFC library
- [Bonsai](https://bonsaibim.org/) - BIM for Blender
- [Pyodide](https://pyodide.org/) - Python for the browser
- All contributors who have helped this project grow

---

Made with ❤️ by [Open Source Construction](https://opensource.construction)
