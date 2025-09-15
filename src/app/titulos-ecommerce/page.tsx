import buscaTitulosTiny from "@/actions/buscaTitulosTiny";
import InputFile from "@/components/CustoTiny/InputFile";
import ReadXlsx from "@/components/TitulosEcommerce/LerPlanilha/ReadXlsx";
import TitulosEcommerce from "@/components/TitulosEcommerce/TitulosEcommerce";

export default async function TitulosEcommercePage() {

    return (
        <div>
            <TitulosEcommerce />
        </div>
    )
}