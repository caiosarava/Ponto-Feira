import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Clock, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const utils = trpc.useUtils();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => setFormError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => setFormError(err.message),
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = () => {
    setFormError("");
    if (isRegisterMode) {
      registerMutation.mutate({ name, email, password });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Ponto Geo</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Registro de Presença com Geolocalização
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {isRegisterMode && (
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRegisterMode ? (
                "Criar conta"
              ) : (
                "Entrar"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFormError("");
                setIsRegisterMode((prev) => !prev);
              }}
            >
              {isRegisterMode ? "Já tenho conta" : "Criar nova conta"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
