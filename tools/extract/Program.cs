// ARC Raiders extractor. Usage:
//   list <substring>            list package paths containing substring
//   json <outDir> <path>...     dump each package's exports as JSON
//   glb  <outDir> <path>...     export meshes as flat glTF (no materials/textures)
// Config comes from .env (ARC_GAME_DIR, ARC_USMAP, ARC_AES_KEY).
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.GameTypes.Theia.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
using CUE4Parse_Conversion;
using CUE4Parse_Conversion.Options;
using Newtonsoft.Json;

static void LoadEnv()
{
    var f = Path.Combine(AppContext.BaseDirectory, "../../../.env");
    if (!File.Exists(f)) f = ".env";
    if (!File.Exists(f)) return;
    foreach (var line in File.ReadAllLines(f))
    {
        var l = line.Split('#')[0].Trim();
        var i = l.IndexOf('=');
        if (i > 0) Environment.SetEnvironmentVariable(l[..i].Trim(), l[(i + 1)..].Trim());
    }
}

LoadEnv();
string Env(string k) => Environment.GetEnvironmentVariable(k) ?? throw new Exception($"missing {k} in .env");

var provider = new TheiaFileProvider(Env("ARC_GAME_DIR"), SearchOption.TopDirectoryOnly, new VersionContainer(EGame.GAME_ArcRaiders));
provider.MappingsContainer = new FileUsmapTypeMappingsProvider(Env("ARC_USMAP"));
provider.Initialize();
provider.SubmitKey(new FGuid(), new FAesKey(Env("ARC_AES_KEY")));
Console.Error.WriteLine($"mounted {provider.MountedVfs.Count} containers, {provider.Files.Count} files");

switch (args.ElementAtOrDefault(0))
{
    case "list":
        foreach (var k in provider.Files.Keys.Where(k => k.Contains(args[1], StringComparison.OrdinalIgnoreCase)).Order())
            Console.WriteLine(k);
        break;
    case "json":
        foreach (var p in args.Skip(2))
        {
            var o = Path.Combine(args[1], Path.GetFileNameWithoutExtension(p) + ".json");
            Directory.CreateDirectory(args[1]);
            File.WriteAllText(o, JsonConvert.SerializeObject(provider.LoadPackage(p).GetExports(), Formatting.Indented));
            Console.WriteLine(o);
        }
        break;
    case "glb":
        foreach (var p in args.Skip(2))
        {
            var tmp = Path.Combine(Path.GetTempPath(), "arcx-" + Guid.NewGuid().ToString("N"));
            var session = new ExportSession();
            session.Add(provider.LoadPackage(p).GetExports().First(e => e is CUE4Parse.UE4.Assets.Exports.SkeletalMesh.USkeletalMesh || e is CUE4Parse.UE4.Assets.Exports.StaticMesh.UStaticMesh));
            var opts = new ExportOptions(meshFormat: EMeshFormat.Gltf2, exportMaterials: false);
            var res = await session.RunAsync(tmp, opts);
            foreach (var r in res.Where(r => !r.Success)) Console.Error.WriteLine($"export failed: {r.Error}");
            // Linux quirk: DiskFilePaths holds a '\\'-separated path that was written as a literal file name in the cwd
            var glb = res.SelectMany(r => r.DiskFilePaths ?? [])
                          .Select(f => File.Exists(f) ? f : Path.Combine(Directory.GetCurrentDirectory(), f))
                          .FirstOrDefault(File.Exists)
                      ?? throw new Exception("no glb produced for " + p);
            Directory.CreateDirectory(args[1]);
            var dest = Path.Combine(args[1], Path.GetFileNameWithoutExtension(p) + ".glb");
            File.Move(glb, dest, true);
            if (Directory.Exists(tmp)) Directory.Delete(tmp, true);
            Console.WriteLine(dest);
        }
        break;
    default:
        Console.Error.WriteLine("usage: list|json|glb ...");
        return 1;
}
return 0;
