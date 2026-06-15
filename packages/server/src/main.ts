import app from "./app";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `[Aurea Server] Started successfully in ${process.env.NODE_ENV || "development"} mode.`,
  );
  console.log(
    `[Aurea Server] Health check available at: http://localhost:${PORT}/api/v1/health`,
  );
});
